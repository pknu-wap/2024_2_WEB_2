package wap.web2.server.admin.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static wap.web2.server.util.SemesterGenerator.generateSemester;
import java.util.*;
import java.util.concurrent.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.orm.jpa.*;
import org.springframework.orm.jpa.persistenceunit.PersistenceManagedTypes;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import wap.web2.server.admin.entity.*;
import wap.web2.server.admin.repository.*;
import wap.web2.server.exception.ConflictException;
import wap.web2.server.member.repository.UserRepository;
import wap.web2.server.project.repository.ProjectRepository;
import wap.web2.server.teambuild.entity.Position;
import wap.web2.server.teambuild.repository.*;
import wap.web2.server.teambuild.service.FieldClusterer;

/** Dedicated disposable database only: these four tables are recreated before each test. */
@EnabledIfEnvironmentVariable(named = "THIRD_ROUND_TEST_URL", matches = ".+")
class ThirdRoundPlanIntegrationTest {
    private LocalContainerEntityManagerFactoryBean factory;
    private TransactionTemplate transaction;
    private ThirdRoundPositionSlotRepository slots;
    private ThirdRoundPlanService service;
    private final String semester = generateSemester();

    @BeforeEach void setup() {
        var env = System.getenv();
        var dataSource = new DriverManagerDataSource(env.get("THIRD_ROUND_TEST_URL"),
            env.getOrDefault("THIRD_ROUND_TEST_USER", "root"), env.getOrDefault("THIRD_ROUND_TEST_PASSWORD", ""));
        var jdbc = new JdbcTemplate(dataSource);
        for (String table : List.of("third_round_position_slot", "third_round_plan_team", "third_round_plan", "team_building_meta"))
            jdbc.execute("DROP TABLE IF EXISTS " + table);
        new ResourceDatabasePopulator(new ClassPathResource("db/migration/V9__create_third_round_plan.sql"),
            new ClassPathResource("db/migration/V10__identify_third_round_applicants.sql")).execute(dataSource);
        jdbc.execute("CREATE TABLE team_building_meta (id BIGINT AUTO_INCREMENT PRIMARY KEY, semester VARCHAR(7) NOT NULL UNIQUE, "
            + "round INT NOT NULL, completed_round INT NOT NULL, status ENUM('OPEN','APPLY','RECRUIT','CLOSED') NOT NULL)");
        factory = new LocalContainerEntityManagerFactoryBean();
        factory.setDataSource(dataSource);
        factory.setManagedTypes(PersistenceManagedTypes.of(TeamBuildingMeta.class.getName(), ThirdRoundPlan.class.getName(),
            ThirdRoundPlanTeam.class.getName(), ThirdRoundPositionSlot.class.getName()));
        factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
        factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", "validate",
            "hibernate.physical_naming_strategy", "org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy"));
        factory.afterPropertiesSet();
        EntityManager em = SharedEntityManagerCreator.createSharedEntityManager(factory.getObject());
        var repositories = new JpaRepositoryFactory(em);
        var metas = repositories.getRepository(TeamBuildingMetaRepository.class);
        var plans = repositories.getRepository(ThirdRoundPlanRepository.class);
        var cards = repositories.getRepository(ThirdRoundPlanTeamRepository.class);
        slots = repositories.getRepository(ThirdRoundPositionSlotRepository.class);
        var manager = new JpaTransactionManager(factory.getObject());
        transaction = new TransactionTemplate(manager);
        transaction.executeWithoutResult(ignored -> metas.save(new TeamBuildingMeta(2, 2, null, semester, TeamBuildingStatus.CLOSED)));
        var target = new ThirdRoundPlanService(metas, plans, cards, slots, mock(ProjectRepository.class),
            mock(TeamRepository.class), mock(ProjectApplyRepository.class), mock(FieldClusterMemberRepository.class),
            mock(UserRepository.class), new FieldClusterer());
        var proxy = new ProxyFactory(target);
        proxy.addAdvice(new TransactionInterceptor(manager, new AnnotationTransactionAttributeSource()));
        service = (ThirdRoundPlanService) proxy.getProxy();
    }
    @AfterEach void cleanup() { if (factory != null) factory.destroy(); }

    @Test void migrationSupportsReloadMoveDeleteAndReturningSlots() {
        assertThat(service.open().revision()).isZero();
        service.open();
        var first = service.create(0);
        long teamA = first.teams().get(0).id();
        service.create(1);
        long teamB = service.get().teams().get(1).id();
        long slotId = transaction.execute(ignored -> slots.save(new ThirdRoundPositionSlot(semester, Position.FRONTEND)).getId());
        service.move(slotId, teamA, 2);
        assertThat(service.get().teams().get(0).members()).hasSize(1);
        service.move(slotId, teamB, 3);
        assertThat(service.get().teams().get(0).members()).isEmpty();
        assertThat(service.get().teams().get(1).members()).hasSize(1);
        service.delete(teamB, 4);
        assertThat(service.get().unassigned()).hasSize(1);
        assertThat(service.get().teams()).hasSize(1);
        assertThat(service.create(5).teams()).extracting(t -> t.teamName()).containsExactly("팀 A", "팀 C");
    }

    @Test void concurrentAdminsCannotOverwriteTheSameRevision() throws Exception {
        service.open();
        var executor = Executors.newFixedThreadPool(2);
        var start = new CountDownLatch(1);
        Callable<Boolean> create = () -> {
            start.await();
            try { service.create(0); return true; }
            catch (ConflictException expected) { return false; }
        };
        try {
            var first = executor.submit(create); var second = executor.submit(create);
            start.countDown();
            assertThat(List.of(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS)))
                .containsExactlyInAnyOrder(true, false);
            assertThat(service.get().teams()).hasSize(1);
            assertThat(service.get().revision()).isEqualTo(1);
        } finally { executor.shutdownNow(); }
    }
}
