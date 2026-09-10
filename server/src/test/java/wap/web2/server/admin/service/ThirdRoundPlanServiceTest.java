package wap.web2.server.admin.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static wap.web2.server.util.SemesterGenerator.generateSemester;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
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

    @Test void initializationLinksLatestEligibleApplicantsAndCorrections() {
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
            assertThat(s.getUserId()).isEqualTo(12L);
        });
    }
    private ProjectApply apply(User user, Project project, Position position, int round) {
        return ProjectApply.builder().user(user).project(project).position(position).round(round).priority(1).build();
    }

    @Test void legacySlotsKeepApplicantNamesAfterMovingAndReloading() {
        ready();
        ThirdRoundPositionSlot first = slot(1, semester), second = slot(2, semester);
        when(slots.findAllBySemesterOrderById(semester)).thenReturn(List.of(first, second));
        User firstUser = user(12), secondUser = user(13);
        firstUser.setName("김다은"); secondUser.setName("이준호");
        when(applies.findAllBySemester(semester)).thenReturn(List.of(
            apply(secondUser, null, Position.FRONTEND, 2),
            apply(firstUser, null, Position.FRONTEND, 2)));
        when(users.findAllById(any())).thenReturn(List.of(firstUser, secondUser));
        var board = service.get();
        assertThat(board.unassigned()).extracting(m -> m.name()).containsExactly("김다은", "이준호");
        assertThat(first.getUserId()).isEqualTo(12L);
        assertThat(second.getUserId()).isEqualTo(13L);
        when(slots.findById(1L)).thenReturn(Optional.of(first));
        ThirdRoundPlanTeam target = card(20, null, semester);
        when(planTeams.findById(20L)).thenReturn(Optional.of(target));
        when(planTeams.findAllBySemesterOrderById(semester)).thenReturn(List.of(target));
        service.move(1, 20L, 0);
        var reloaded = service.get();
        assertThat(reloaded.teams().get(0).members().get(0).name()).isEqualTo("김다은");
        assertThat(reloaded.unassigned().get(0).name()).isEqualTo("이준호");
        verify(applies, times(1)).findAllBySemester(semester);
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

    @Test void shufflePreservesPositionsCountsAndIdentitiesIncludingUnassignedPlaces() {
        ThirdRoundPlan plan = ready();
        ThirdRoundPositionSlot first = slot(1, semester), second = slot(2, semester), third = slot(3, semester);
        first.identify(12L); second.identify(13L); third.identify(14L);
        first.moveTo(20L); second.moveTo(30L);
        ThirdRoundPositionSlot app = new ThirdRoundPositionSlot(semester, Position.APP);
        app.identify(15L); app.moveTo(20L);
        ThirdRoundPositionSlot anonymous = slot(5, semester); anonymous.moveTo(40L);
        when(slots.findAllBySemesterOrderById(semester)).thenReturn(List.of(first, second, third, app, anonymous));
        Random random = mock(Random.class);
        when(random.nextInt(anyInt())).thenReturn(0);
        service.shuffle(0, random);
        assertThat(List.of(first, second, third)).extracting(ThirdRoundPositionSlot::getTeamId)
            .containsExactly(30L, null, 20L);
        assertThat(List.of(first, second, third)).extracting(ThirdRoundPositionSlot::getUserId)
            .containsExactly(12L, 13L, 14L);
        assertThat(List.of(first, second, third)).allMatch(s -> s.getPosition() == Position.FRONTEND);
        assertThat(app.getTeamId()).isEqualTo(20L);
        assertThat(app.getUserId()).isEqualTo(15L);
        assertThat(anonymous.getTeamId()).isEqualTo(40L);
        assertThat(plan.getRevision()).isEqualTo(1);
        verify(teams, never()).saveAll(any());
        assertThatThrownBy(() -> service.shuffle(0)).isInstanceOf(ConflictException.class);
    }

    @Test void shuffleCanKeepTheSameArrangementAndHandlesEmptyPlans() {
        ThirdRoundPlan plan = ready();
        ThirdRoundPositionSlot first = slot(1, semester), second = slot(2, semester);
        first.identify(12L); second.identify(13L);
        first.moveTo(20L); second.moveTo(30L);
        when(slots.findAllBySemesterOrderById(semester)).thenReturn(List.of(first, second));
        Random random = mock(Random.class);
        when(random.nextInt(2)).thenReturn(1);
        service.shuffle(0, random);
        assertThat(first.getTeamId()).isEqualTo(20L);
        assertThat(second.getTeamId()).isEqualTo(30L);
        when(slots.findAllBySemesterOrderById(semester)).thenReturn(List.of());
        assertThat(service.shuffle(1).unassigned()).isEmpty();
        assertThat(plan.getRevision()).isEqualTo(2);
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
            assertThatThrownBy(() -> service.shuffle(0)).isInstanceOf(ConflictException.class);
        }
        verifyNoInteractions(slots, planTeams);
    }

    @Test void completionPublishesExistingTeamAllocationsAndFreezesThePlan() {
        ThirdRoundPlan plan = ready();
        User leader = user(10), firstUser = user(12), secondUser = user(13);
        when(projects.findProjectsBySemester(semester)).thenReturn(List.of(
            Project.builder().projectId(100L).title("기존 팀").user(leader).build()));
        when(planTeams.findAllBySemesterOrderById(semester)).thenReturn(List.of(
            card(20, 100L, semester), card(30, null, semester)));
        ThirdRoundPositionSlot first = slot(1, semester), second = slot(2, semester), unassigned = slot(3, semester);
        first.identify(12L); second.identify(13L); unassigned.identify(14L);
        first.moveTo(20L); second.moveTo(30L);
        when(slots.findAllBySemesterOrderById(semester)).thenReturn(List.of(first, second, unassigned));
        when(users.findAllById(any())).thenReturn(List.of(firstUser, secondUser, user(14)));
        when(teams.saveAll(any())).thenAnswer(call -> {
            List<Team> saved = call.getArgument(0);
            when(teams.findAllBySemester(semester)).thenReturn(saved);
            return saved;
        });
        var board = service.complete(0);
        assertThat(board.completed()).isTrue();
        assertThat(board.revision()).isEqualTo(1);
        assertThat(board.teams().get(0).members()).hasSize(1);
        assertThat(board.teams().get(1).members()).hasSize(1);
        assertThat(board.unassigned()).hasSize(1);
        ArgumentCaptor<List<Team>> allocation = ArgumentCaptor.forClass(List.class);
        verify(teams).saveAll(allocation.capture());
        assertThat(allocation.getValue()).singleElement().satisfies(team -> {
            assertThat(team.getProjectId()).isEqualTo(100L);
            assertThat(team.getMemberId()).isEqualTo(12L);
            assertThat(team.getLeaderId()).isEqualTo(10L);
            assertThat(team.getRound()).isEqualTo(3);
            assertThat(team.getPosition()).isEqualTo(Position.FRONTEND);
        });
        assertThat(service.open().completed()).isTrue();
        assertThat(service.get().completed()).isTrue();
        assertThatThrownBy(() -> service.complete(1)).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> service.shuffle(1)).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> service.move(1, null, 1)).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> service.create(1)).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> service.delete(30, 1)).isInstanceOf(ConflictException.class);
        assertThat(plan.isCompleted()).isTrue();
    }

    @Test void completionRejectsStaleRevisionMissingApplicantsAndDuplicateAllocations() {
        ThirdRoundPlan plan = ready();
        assertThatThrownBy(() -> service.complete(1)).isInstanceOf(ConflictException.class);
        ThirdRoundPositionSlot slot = slot(1, semester); slot.moveTo(20L);
        when(slots.findAllBySemesterOrderById(semester)).thenReturn(List.of(slot));
        assertThatThrownBy(() -> service.complete(0)).isInstanceOf(ConflictException.class);
        slot.identify(12L);
        when(users.findAllById(any())).thenReturn(List.of(user(12)));
        ThirdRoundPositionSlot duplicate = slot(2, semester);
        duplicate.identify(12L); duplicate.moveTo(20L);
        when(slots.findAllBySemesterOrderById(semester)).thenReturn(List.of(slot, duplicate));
        when(planTeams.findAllBySemesterOrderById(semester)).thenReturn(List.of(card(20, null, semester)));
        assertThatThrownBy(() -> service.complete(0)).isInstanceOf(ConflictException.class);
        verify(teams, never()).saveAll(any());
        assertThat(plan.isCompleted()).isFalse();
        assertThat(plan.getRevision()).isZero();
    }

    @Test void boardShowsProjectLeaderEvenWithoutMembersAndKeepsCreatedTeamsLeaderless() {
        ready();
        User owner = user(10); owner.setName("팀장 이름");
        when(projects.findProjectsBySemester(semester)).thenReturn(List.of(
            Project.builder().projectId(100L).user(owner).projectType("WEB").build()));
        when(planTeams.findAllBySemesterOrderById(semester)).thenReturn(List.of(
            card(20, 100L, semester), card(30, null, semester)));
        var board = service.get();
        assertThat(board.teams().get(0).projectType()).isEqualTo("WEB");
        assertThat(board.teams().get(1).projectType()).isNull();
        assertThat(board.teams().get(0).leader().id()).isEqualTo(10L);
        assertThat(board.teams().get(0).leader().name()).isEqualTo("팀장 이름");
        assertThat(board.teams().get(0).members()).isEmpty();
        assertThat(board.teams().get(1).leader()).isNull();
        assertThat(board.unassigned()).isEmpty();
    }

    @Test void boardUpgradesExistingMembersToEditableSlotsAndPreservesAnonymousSlots() {
        ready();
        when(planTeams.findAllBySemesterOrderById(semester)).thenReturn(List.of(card(20, 100L, semester)));
        ThirdRoundPositionSlot slot = slot(1, semester); slot.moveTo(20L);
        when(slots.findAllBySemesterOrderById(semester)).thenReturn(List.of(slot));
        when(teams.findAllBySemester(semester)).thenReturn(List.of(Team.builder()
            .projectId(100L).memberId(11L).position(Position.AI).build()));
        when(users.findAllById(List.of(11L))).thenReturn(List.of(user(11)));
        when(slots.save(any())).thenAnswer(call -> {
            ThirdRoundPositionSlot saved = call.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", 2L);
            return saved;
        });
        var board = service.get();
        assertThat(board.teams().get(0).members()).hasSize(2);
        assertThat(board.teams().get(0).members().get(1).name()).isEqualTo("기존 멤버");
        assertThat(board.teams().get(0).members().get(1).type()).isEqualTo("POSITION_SLOT");
        var anonymous = board.teams().get(0).members().get(0);
        assertThat(anonymous.name()).isNull();
        assertThat(anonymous.id()).isEqualTo("slot-1");
    }
    @ParameterizedTest
    @NullSource
    @ValueSource(longs = {20, 30, 40})
    void existingMemberMovesPersistInDraftAndPublishOnlyOnCompletion(Long destination) {
        ready();
        User owner = user(10), member = user(11);
        when(projects.findProjectsBySemester(semester)).thenReturn(List.of(
            Project.builder().projectId(100L).user(owner).build(),
            Project.builder().projectId(200L).user(owner).build()));
        var original = card(20, 100L, semester);
        var other = card(30, 200L, semester);
        var created = card(40, null, semester);
        when(planTeams.findAllBySemesterOrderById(semester)).thenReturn(List.of(original, other, created));
        Team allocation = Team.builder().projectId(100L).memberId(11L).leaderId(10L)
            .position(Position.FRONTEND).semester(semester).round(2).build();
        List<Team> published = new ArrayList<>(List.of(allocation));
        when(teams.findAllBySemester(semester)).thenAnswer(call -> new ArrayList<>(published));
        List<ThirdRoundPositionSlot> persisted = new ArrayList<>();
        when(slots.findAllBySemesterOrderById(semester)).thenAnswer(call -> new ArrayList<>(persisted));
        when(slots.save(any())).thenAnswer(call -> {
            ThirdRoundPositionSlot saved = call.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", 1L);
            persisted.add(saved);
            return saved;
        });
        when(users.findAllById(any())).thenReturn(List.of(member));
        assertThat(service.open().teams().get(0).members()).singleElement()
            .satisfies(m -> assertThat(m.type()).isEqualTo("POSITION_SLOT"));
        when(slots.findById(1L)).thenReturn(Optional.of(persisted.get(0)));
        if (destination != null) when(planTeams.findById(destination)).thenReturn(Optional.of(
            destination == 20 ? original : destination == 30 ? other : created));
        var moved = service.move(1, destination, 0);
        service.open();
        assertThat(persisted).hasSize(1);
        assertThat(persisted.get(0).getTeamId()).isEqualTo(destination);
        verify(teams, never()).deleteAll(any());
        verify(teams, never()).saveAll(any());
        doAnswer(call -> { published.removeAll(call.getArgument(0)); return null; })
            .when(teams).deleteAll(any());
        when(teams.saveAll(any())).thenAnswer(call -> {
            List<Team> saved = call.getArgument(0); published.addAll(saved); return saved;
        });
        var completed = service.complete(moved.revision());
        assertThat(completed.completed()).isTrue();
        if (destination == null || destination == 40) assertThat(published).isEmpty();
        else assertThat(published).singleElement().satisfies(t -> {
            assertThat(t.getProjectId()).isEqualTo(destination == 20 ? 100L : 200L);
            assertThat(t.getRound()).isEqualTo(destination == 20 ? 2 : 3);
            assertThat(t.getMemberId()).isEqualTo(11L);
        });
        assertThat(completed.unassigned()).hasSize(destination == null ? 1 : 0);
        assertThat(completed.teams().stream().mapToInt(t -> t.members().size()).sum())
            .isEqualTo(destination == null ? 0 : 1);
        service.open();
        verify(slots).save(any());
    }

}
