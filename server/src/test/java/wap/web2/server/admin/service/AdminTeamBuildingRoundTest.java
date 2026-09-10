package wap.web2.server.admin.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static wap.web2.server.util.SemesterGenerator.generateSemester;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import wap.web2.server.admin.entity.*;
import wap.web2.server.admin.repository.TeamBuildingMetaRepository;
import wap.web2.server.exception.ConflictException;
import wap.web2.server.member.entity.User;
import wap.web2.server.project.entity.Project;
import wap.web2.server.project.repository.ProjectRepository;
import wap.web2.server.teambuild.entity.*;
import wap.web2.server.teambuild.repository.*;
import wap.web2.server.teambuild.service.PositionTeamBuilder;

@ExtendWith(MockitoExtension.class)
class AdminTeamBuildingRoundTest {
    @Mock TeamBuildingMetaRepository teamBuildingMetaRepository;
    @Mock ProjectRecruitRepository recruitRepository;
    @Mock ProjectApplyRepository applyRepository;
    @Mock ProjectRepository projectRepository;
    @Mock TeamRepository teamRepository;
    @Mock FieldClusterMemberRepository clusterRepository;
    @Mock PositionTeamBuilder teamBuilder;
    @Mock wap.web2.server.admin.repository.ThirdRoundPlanRepository plans;
    @Mock wap.web2.server.admin.repository.ThirdRoundPlanTeamRepository planTeams;
    @Mock wap.web2.server.admin.repository.ThirdRoundPositionSlotRepository slots;
    @InjectMocks AdminTeamBuildingService service;

    @Test void resetClearsCurrentSemesterAllocationsAndRestartsCompletedTeamBuilding() {
        String semester = generateSemester();
        TeamBuildingMeta meta = new TeamBuildingMeta(3, 3, 1L, semester, TeamBuildingStatus.CLOSED);
        when(teamBuildingMetaRepository.findBySemesterForUpdate(semester)).thenReturn(Optional.of(meta));

        service.resetTeamBuilding();
        var order = inOrder(slots, planTeams, plans);
        order.verify(slots).deleteAllInBatch(any());
        order.verify(planTeams).deleteAllInBatch(any());
        order.verify(plans).deleteById(semester);

        verify(teamRepository).deleteBySemester(semester);
        verify(clusterRepository).deleteBySemester(semester);
        verifyNoInteractions(applyRepository, recruitRepository, projectRepository, teamBuilder);
        assertThat(meta.getStatus()).isEqualTo(TeamBuildingStatus.OPEN);
        assertThat(meta.getRound()).isEqualTo(1);
        assertThat(meta.getCompletedRound()).isZero();
        meta.changeStatus(TeamBuildingStatus.APPLY);
        assertThat(meta.getRound()).isEqualTo(1);
    }

    @Test void resetWithoutTeamBuildingDoesNotDeleteData() {
        when(teamBuildingMetaRepository.findBySemesterForUpdate(generateSemester())).thenReturn(Optional.empty());

        assertThatThrownBy(service::resetTeamBuilding).isInstanceOf(ConflictException.class);

        verifyNoInteractions(teamRepository, clusterRepository, applyRepository, recruitRepository);
    }

    @Test void completeResetDeletesAllCurrentSemesterSubmissionsAndRestarts() {
        String semester = generateSemester();
        TeamBuildingMeta meta = new TeamBuildingMeta(3, 3, 1L, semester, TeamBuildingStatus.CLOSED);
        when(teamBuildingMetaRepository.findBySemesterForUpdate(semester)).thenReturn(Optional.of(meta));

        service.resetTeamBuildingCompletely();

        verify(slots).deleteAllInBatch(any());
        verify(planTeams).deleteAllInBatch(any());
        verify(plans).deleteById(semester);
        verify(teamRepository).deleteBySemester(semester);
        verify(clusterRepository).deleteBySemester(semester);
        var order = inOrder(recruitRepository, applyRepository);
        order.verify(recruitRepository).deleteBySemester(semester);
        order.verify(applyRepository).deleteBySemester(semester);
        verifyNoInteractions(projectRepository, teamBuilder);
        assertThat(meta.getStatus()).isEqualTo(TeamBuildingStatus.OPEN);
        assertThat(meta.getRound()).isEqualTo(1);
        assertThat(meta.getCompletedRound()).isZero();
    }

    @Test void completeResetWithoutTeamBuildingDoesNotDeleteData() {
        when(teamBuildingMetaRepository.findBySemesterForUpdate(generateSemester())).thenReturn(Optional.empty());

        assertThatThrownBy(service::resetTeamBuildingCompletely).isInstanceOf(ConflictException.class);

        verifyNoInteractions(slots, planTeams, plans, teamRepository, clusterRepository,
            applyRepository, recruitRepository, projectRepository);
    }

    @Test void secondRoundPreservesExistingMembersAndCannotBeRunTwice() {
        String semester = generateSemester();
        TeamBuildingMeta meta = new TeamBuildingMeta(2, 1, 1L, semester, TeamBuildingStatus.CLOSED);
        when(teamBuildingMetaRepository.findBySemesterForUpdate(semester)).thenReturn(Optional.of(meta));
        User leader = new User(); leader.setId(10L);
        when(projectRepository.findProjectsBySemester(semester)).thenReturn(List.of(
            Project.builder().projectId(100L).user(leader).build()));
        when(teamRepository.findAllBySemester(semester)).thenReturn(List.of(Team.builder().memberId(20L).build()));
        when(teamBuilder.allocate(List.of(), List.of(), Set.of(10L, 20L))).thenReturn(Map.of(
            new PositionTeamBuilder.Slot(100L, Position.AI), Set.of(30L)));
        service.makeTeam();
        verify(applyRepository).findAllBySemesterAndRound(semester, 2);
        verify(recruitRepository).findAllBySemesterAndRound(semester, 2);
        ArgumentCaptor<List<Team>> teams = ArgumentCaptor.forClass(List.class);
        verify(teamRepository).saveAll(teams.capture());
        assertThat(teams.getValue()).singleElement().satisfies(t -> {
            assertThat(t.getMemberId()).isEqualTo(30L); assertThat(t.getRound()).isEqualTo(2);
        });
        assertThatThrownBy(service::makeTeam).isInstanceOf(ConflictException.class);
    }

    @Test void reopeningAfterCompletedFirstRoundAdvancesToSecondRound() {
        TeamBuildingMeta meta = new TeamBuildingMeta(1L, "2026-02", TeamBuildingStatus.CLOSED);
        meta.changeStatus(TeamBuildingStatus.APPLY);
        assertThat(meta.getRound()).isEqualTo(1);
        meta.changeStatus(TeamBuildingStatus.CLOSED);
        meta.completeRound();
        meta.changeStatus(TeamBuildingStatus.APPLY);
        assertThat(meta.getRound()).isEqualTo(2);
        meta.changeStatus(TeamBuildingStatus.CLOSED);
        meta.completeRound();
        assertThatThrownBy(() -> meta.changeStatus(TeamBuildingStatus.APPLY)).isInstanceOf(ConflictException.class);
    }
}
