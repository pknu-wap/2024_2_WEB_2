package wap.web2.server.admin.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static wap.web2.server.util.SemesterGenerator.generateSemester;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import wap.web2.server.admin.entity.*;
import wap.web2.server.admin.repository.*;
import wap.web2.server.exception.*;
import wap.web2.server.member.entity.User;
import wap.web2.server.member.repository.UserRepository;
import wap.web2.server.project.entity.Project;
import wap.web2.server.project.repository.ProjectRepository;
import wap.web2.server.teambuild.entity.*;
import wap.web2.server.teambuild.repository.*;
import wap.web2.server.teambuild.service.FieldClusterer;

@ExtendWith(MockitoExtension.class)
class ThirdRoundPlanServiceTest {
    @Mock TeamBuildingMetaRepository metas;
    @Mock ThirdRoundPlanRepository plans;
    @Mock ThirdRoundPlanTeamRepository planTeams;
    @Mock ThirdRoundPositionSlotRepository slots;
    @Mock ProjectRepository projects;
    @Mock TeamRepository teams;
    @Mock ProjectApplyRepository applies;
    @Mock FieldClusterMemberRepository clusters;
    @Mock UserRepository users;
    @Spy FieldClusterer clusterer = new FieldClusterer();
    @InjectMocks ThirdRoundPlanService service;
    private final String semester = generateSemester();

    private ThirdRoundPlan ready() {
        when(metas.findBySemesterForUpdate(semester)).thenReturn(Optional.of(
            new TeamBuildingMeta(2, 2, 1L, semester, TeamBuildingStatus.CLOSED)));
        ThirdRoundPlan plan = new ThirdRoundPlan(semester);
        when(plans.findById(semester)).thenReturn(Optional.of(plan));
        return plan;
    }
    private ThirdRoundPlanTeam card(long id, Long projectId, String term) {
        ThirdRoundPlanTeam team = new ThirdRoundPlanTeam(term, projectId, "팀 A");
        ReflectionTestUtils.setField(team, "id", id);
        return team;
    }
    private ThirdRoundPositionSlot slot(long id, String term) {
        ThirdRoundPositionSlot slot = new ThirdRoundPositionSlot(term, Position.FRONTEND);
        ReflectionTestUtils.setField(slot, "id", id);
        return slot;
    }
    private User user(long id) {
        User user = new User(); user.setId(id); user.setName("기존 멤버"); return user;
    }

    @Test void initializationCreatesNamelessSlotsFromLatestEligibleApplicantsAndCorrections() {
        ready(); when(plans.findById(semester)).thenReturn(Optional.empty());
        when(plans.save(any())).thenAnswer(c -> c.getArgument(0));
        User leader = user(10), assigned = user(11), candidate = user(12);
        Project project = Project.builder().projectId(100L).title("기존 팀").user(leader).build();
        when(projects.findProjectsBySemester(semester)).thenReturn(List.of(project));
        when(teams.findAllBySemester(semester)).thenReturn(List.of(Team.builder()
            .projectId(100L).memberId(11L).position(Position.AI).round(2).build()));
        when(applies.findAllBySemester(semester)).thenReturn(List.of(
            apply(leader, project, Position.AI, 2), apply(assigned, project, Position.AI, 2),
            apply(candidate, project, Position.AI, 1), apply(candidate, project, Position.BACKEND, 2)));
        when(clusters.findAllBySemesterOrderByUserId(semester)).thenReturn(List.of(
            new FieldClusterMember(semester, 12L, Position.FRONTEND),
            new FieldClusterMember(semester, 11L, Position.GAME)));
        service.open();
        ArgumentCaptor<List<ThirdRoundPositionSlot>> saved = ArgumentCaptor.forClass(List.class);
        verify(slots).saveAll(saved.capture());
        assertThat(saved.getValue()).singleElement().satisfies(s -> {
            assertThat(s.getPosition()).isEqualTo(Position.FRONTEND);
            assertThat(s.getTeamId()).isNull();
        });
    }
    private ProjectApply apply(User user, Project project, Position position, int round) {
        return ProjectApply.builder().user(user).project(project).position(position).round(round).priority(1).build();
    }

    @Test void openingExistingPlanDoesNotRecreateSlots() {
        ready(); service.open(); service.open();
        verify(slots, never()).saveAll(any());
        verify(planTeams, never()).saveAll(any());
        verifyNoInteractions(applies, clusters);
    }

    @Test void createsEmptyTeamsWithMonotonicAlphabetNamesAndRejectsStaleRevision() {
        ThirdRoundPlan plan = ready();
        service.create(0); service.create(1);
        ArgumentCaptor<ThirdRoundPlanTeam> saved = ArgumentCaptor.forClass(ThirdRoundPlanTeam.class);
        verify(planTeams, times(2)).save(saved.capture());
        assertThat(saved.getAllValues()).extracting(ThirdRoundPlanTeam::getName).containsExactly("팀 A", "팀 B");
        assertThat(saved.getAllValues()).allMatch(ThirdRoundPlanTeam::isCreated);
        assertThat(plan.getRevision()).isEqualTo(2);
        assertThatThrownBy(() -> service.create(0)).isInstanceOf(ConflictException.class);
        assertThat(plan.getRevision()).isEqualTo(2);
        verify(slots, never()).saveAll(any());
    }

    @Test void namingContinuesPastZ() {
        ThirdRoundPlan plan = new ThirdRoundPlan(semester);
        for (int i = 0; i < 26; i++) plan.nextTeamName();
        assertThat(plan.nextTeamName()).isEqualTo("팀 AA");
    }

    @Test void movesOneSlotWithoutDuplicatingOrChangingOtherSlotsAndSupportsUnassignment() {
        ThirdRoundPlan plan = ready();
        ThirdRoundPositionSlot first = slot(1, semester), second = slot(2, semester);
        first.moveTo(10L); second.moveTo(10L);
        when(slots.findById(1L)).thenReturn(Optional.of(first));
        when(planTeams.findById(20L)).thenReturn(Optional.of(card(20, null, semester)));
        service.move(1, 20L, 0);
        assertThat(first.getTeamId()).isEqualTo(20);
        assertThat(second.getTeamId()).isEqualTo(10);
        service.move(1, 20L, 1);
        assertThat(plan.getRevision()).isEqualTo(1);
        service.move(1, null, 1);
        assertThat(first.getTeamId()).isNull();
        assertThat(plan.getRevision()).isEqualTo(2);
        verify(slots, never()).save(any());
    }

    @Test void preventsCrossSemesterSlotAndTeamAccess() {
        ready();
        when(slots.findById(1L)).thenReturn(Optional.of(slot(1, "2000-1")));
        assertThatThrownBy(() -> service.move(1, null, 0)).isInstanceOf(ResourceNotFoundException.class);
        ThirdRoundPositionSlot current = slot(2, semester);
        when(slots.findById(2L)).thenReturn(Optional.of(current));
        when(planTeams.findById(20L)).thenReturn(Optional.of(card(20, null, "2000-1")));
        assertThatThrownBy(() -> service.move(2, 20L, 0)).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> service.delete(20, 0)).isInstanceOf(ResourceNotFoundException.class);
        assertThat(current.getTeamId()).isNull();
    }

    @Test void deletingCreatedTeamReturnsItsSlotsAndPreservesOtherTeams() {
        ThirdRoundPlan plan = ready();
        ThirdRoundPlanTeam team = card(20, null, semester);
        when(planTeams.findById(20L)).thenReturn(Optional.of(team));
        ThirdRoundPositionSlot first = slot(1, semester), second = slot(2, semester);
        first.moveTo(20L); second.moveTo(30L);
        when(slots.findAllBySemesterOrderById(semester)).thenReturn(List.of(first, second));
        service.delete(20, 0);
        assertThat(first.getTeamId()).isNull();
        assertThat(second.getTeamId()).isEqualTo(30);
        var order = inOrder(slots, planTeams);
        order.verify(slots).flush(); order.verify(planTeams).delete(team);
        assertThat(plan.getRevision()).isEqualTo(1);
    }

    @Test void cannotDeleteExistingProjectTeam() {
        ready(); when(planTeams.findById(20L)).thenReturn(Optional.of(card(20, 100L, semester)));
        assertThatThrownBy(() -> service.delete(20, 0)).isInstanceOf(BadRequestException.class);
        verify(planTeams, never()).delete(any());
    }

    @Test void rejectsChangesBeforeSecondRoundAndAfterThirdRoundCompletion() {
        for (int round : List.of(0, 1, 3)) {
            when(metas.findBySemesterForUpdate(semester)).thenReturn(Optional.of(
                new TeamBuildingMeta(round, round, 1L, semester, TeamBuildingStatus.CLOSED)));
            assertThatThrownBy(service::open).isInstanceOf(ConflictException.class);
        }
        verifyNoInteractions(plans, slots, planTeams);
    }

    @Test void boardKeepsRealMemberNamesButSlotsHaveNoNameOrUserId() {
        ready();
        when(planTeams.findAllBySemesterOrderById(semester)).thenReturn(List.of(card(20, 100L, semester)));
        ThirdRoundPositionSlot slot = slot(1, semester); slot.moveTo(20L);
        when(slots.findAllBySemesterOrderById(semester)).thenReturn(List.of(slot));
        when(teams.findAllBySemester(semester)).thenReturn(List.of(Team.builder()
            .projectId(100L).memberId(11L).position(Position.AI).build()));
        when(users.findAllById(List.of(11L))).thenReturn(List.of(user(11)));
        var board = service.get();
        assertThat(board.teams().get(0).members()).hasSize(2);
        assertThat(board.teams().get(0).members().get(0).name()).isEqualTo("기존 멤버");
        var anonymous = board.teams().get(0).members().get(1);
        assertThat(anonymous.name()).isNull();
        assertThat(anonymous.id()).isEqualTo("slot-1");
    }
}
