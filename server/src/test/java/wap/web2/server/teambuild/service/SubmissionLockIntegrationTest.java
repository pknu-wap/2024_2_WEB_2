package wap.web2.server.teambuild.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static wap.web2.server.util.SemesterGenerator.generateSemester;

import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactory;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.SharedEntityManagerCreator;
import org.springframework.orm.jpa.persistenceunit.PersistenceManagedTypes;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import wap.web2.server.admin.entity.TeamBuildingMeta;
import wap.web2.server.admin.entity.TeamBuildingStatus;
import wap.web2.server.admin.repository.TeamBuildingMetaRepository;
import wap.web2.server.exception.ConflictException;
import wap.web2.server.global.security.UserPrincipal;
import wap.web2.server.member.entity.User;
import wap.web2.server.member.repository.UserRepository;
import wap.web2.server.project.entity.Project;
import wap.web2.server.project.repository.ProjectRepository;
import wap.web2.server.teambuild.dto.RecruitmentDto;
import wap.web2.server.teambuild.dto.request.ProjectAppliesRequest;
import wap.web2.server.teambuild.repository.ProjectApplyRepository;
import wap.web2.server.teambuild.repository.ProjectRecruitRepository;
import wap.web2.server.teambuild.repository.ProjectRecruitWishRepository;

/** Uses a disposable MySQL database: the team_building_meta table is recreated.
 * Set TEAM_BUILD_LOCK_TEST_URL, optionally TEAM_BUILD_LOCK_TEST_USER/PASSWORD.
 * Only meta persistence is real; submission repositories expose transaction checkpoints.
 */
@EnabledIfEnvironmentVariable(named = "TEAM_BUILD_LOCK_TEST_URL", matches = ".+")
class SubmissionLockIntegrationTest {
    private LocalContainerEntityManagerFactoryBean factory;
    private EntityManager entityManager;
    private TransactionTemplate transaction;
    private TeamBuildingMetaRepository metas;
    private final UserRepository users = mock(UserRepository.class);
    private final ProjectRepository projects = mock(ProjectRepository.class);
    private final ProjectApplyRepository applies = mock(ProjectApplyRepository.class);
    private final ProjectRecruitRepository recruits = mock(ProjectRecruitRepository.class);
    private final ProjectRecruitWishRepository wishes = mock(ProjectRecruitWishRepository.class);
    private final UserPrincipal principal = mock(UserPrincipal.class);
    private final ExecutorService executor = Executors.newFixedThreadPool(2);
    private final CountDownLatch release = new CountDownLatch(1);
    private ApplyService service;

    @BeforeEach
    void setup() {
        var env = System.getenv();
        factory = new LocalContainerEntityManagerFactoryBean();
        factory.setDataSource(new DriverManagerDataSource(env.get("TEAM_BUILD_LOCK_TEST_URL"),
            env.getOrDefault("TEAM_BUILD_LOCK_TEST_USER", "root"),
            env.getOrDefault("TEAM_BUILD_LOCK_TEST_PASSWORD", "")));
        factory.setManagedTypes(PersistenceManagedTypes.of(TeamBuildingMeta.class.getName()));
        factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
        factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", "create-drop"));
        factory.afterPropertiesSet();
        entityManager = SharedEntityManagerCreator.createSharedEntityManager(factory.getObject());
        metas = new JpaRepositoryFactory(entityManager).getRepository(TeamBuildingMetaRepository.class);
        var transactionManager = new JpaTransactionManager(factory.getObject());
        transaction = new TransactionTemplate(transactionManager);
        var proxy = new ProxyFactory(new ApplyService(metas, wishes, recruits, applies, projects, users));
        proxy.addAdvice(new TransactionInterceptor(transactionManager, new AnnotationTransactionAttributeSource()));
        service = (ApplyService) proxy.getProxy();
        User user = new User();
        user.setId(1L);
        when(principal.getId()).thenReturn(1L);
        when(users.findByIdForUpdate(1L)).thenReturn(Optional.of(user));
        when(users.findById(1L)).thenReturn(Optional.of(user));
        when(projects.findById(10L)).thenReturn(Optional.of(
            Project.builder().projectId(10L).user(user).build()));
        when(recruits.save(any())).thenAnswer(call -> call.getArgument(0));
    }

    @AfterEach
    void cleanup() throws InterruptedException {
        release.countDown();
        executor.shutdownNow();
        executor.awaitTermination(10, TimeUnit.SECONDS);
        if (factory != null) factory.destroy();
    }

    private void initialize(TeamBuildingStatus status) {
        transaction.executeWithoutResult(ignored ->
            metas.save(new TeamBuildingMeta(2, 1, null, generateSemester(), status)));
    }

    private void submit(TeamBuildingStatus status) {
        if (status == TeamBuildingStatus.APPLY) {
            service.apply(principal, new ProjectAppliesRequest(List.of(
                new ProjectAppliesRequest.ApplyRequest(10L, "backend", "comment"))), 2);
        } else {
            service.setPreference(principal, new RecruitmentDto(10L, List.of(
                new RecruitmentDto.RecruitmentInfo(1, "backend", List.of()))), 2);
        }
    }

    private static void await(CountDownLatch latch) {
        try {
            assertThat(latch.await(10, TimeUnit.SECONDS)).isTrue();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AssertionError(e);
        }
    }

    @ParameterizedTest
    @EnumSource(value = TeamBuildingStatus.class, names = {"APPLY", "RECRUIT"})
    void closingWaitsUntilSubmissionCommits(TeamBuildingStatus status) throws Exception {
        initialize(status);
        CountDownLatch saved = new CountDownLatch(1);
        if (status == TeamBuildingStatus.APPLY) {
            when(applies.save(any())).thenAnswer(call -> {
                saved.countDown(); await(release); return call.getArgument(0);
            });
        } else {
            when(recruits.save(any())).thenAnswer(call -> {
                saved.countDown(); await(release); return call.getArgument(0);
            });
        }
        Future<?> submission = executor.submit(() -> submit(status));
        await(saved);
        CountDownLatch closing = new CountDownLatch(1);
        Future<?> close = executor.submit(() -> transaction.executeWithoutResult(ignored -> {
            closing.countDown();
            metas.findBySemesterForUpdate(generateSemester()).orElseThrow()
                .changeStatus(TeamBuildingStatus.CLOSED);
        }));
        await(closing);
        assertThatThrownBy(() -> close.get(300, TimeUnit.MILLISECONDS))
            .isInstanceOf(TimeoutException.class);
        release.countDown();
        submission.get(10, TimeUnit.SECONDS);
        close.get(10, TimeUnit.SECONDS);
        assertThat(metas.findBySemester(generateSemester()).orElseThrow().getStatus())
            .isEqualTo(TeamBuildingStatus.CLOSED);
    }

    @ParameterizedTest
    @EnumSource(value = TeamBuildingStatus.class, names = {"APPLY", "RECRUIT"})
    void submissionWaitsForClosingThenRejectsWithoutWriting(TeamBuildingStatus status) throws Exception {
        initialize(status);
        CountDownLatch closed = new CountDownLatch(1);
        Future<?> close = executor.submit(() -> transaction.executeWithoutResult(ignored -> {
            metas.findBySemesterForUpdate(generateSemester()).orElseThrow()
                .changeStatus(TeamBuildingStatus.CLOSED);
            entityManager.flush();
            closed.countDown();
            await(release);
        }));
        await(closed);
        CountDownLatch submitting = new CountDownLatch(1);
        Future<?> submission = executor.submit(() -> {
            submitting.countDown(); submit(status);
        });
        await(submitting);
        assertThatThrownBy(() -> submission.get(300, TimeUnit.MILLISECONDS))
            .isInstanceOf(TimeoutException.class);
        release.countDown();
        close.get(10, TimeUnit.SECONDS);
        assertThatThrownBy(() -> submission.get(10, TimeUnit.SECONDS))
            .isInstanceOf(ExecutionException.class).hasCauseInstanceOf(ConflictException.class);
        verifyNoInteractions(users, projects, applies, recruits, wishes);
    }
}
