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
import wap.web2.server.exception.*;
import wap.web2.server.member.entity.User;
import wap.web2.server.project.entity.Project;
import wap.web2.server.project.repository.ProjectRepository;
import wap.web2.server.teambuild.entity.*;
import wap.web2.server.teambuild.repository.*;
import wap.web2.server.teambuild.service.*;

@ExtendWith(MockitoExtension.class)
class ThirdRoundTeamBuildingServiceTest {
    @Mock TeamBuildingMetaRepository metaRepository;
    @Mock FieldClusterMemberRepository clusterRepository;
    @Mock ProjectApplyRepository applyRepository;
    @Mock ProjectRecruitRepository recruitRepository;
    @Mock TeamRepository teamRepository;
    @Mock ProjectRepository projectRepository;
    @Spy FieldClusterer clusterer = new FieldClusterer();
    @Spy RandomFieldTeamBuilder builder = new RandomFieldTeamBuilder();
    @InjectMocks ThirdRoundTeamBuildingService service;

    private TeamBuildingMeta ready() {
        TeamBuildingMeta meta = new TeamBuildingMeta(2, 2, 1L, generateSemester(), TeamBuildingStatus.CLOSED);
        when(metaRepository.findBySemesterForUpdate(generateSemester())).thenReturn(Optional.of(meta));
        return meta;
    }
    private void candidates() {
        User leader = new User(); leader.setId(10L);
        Project project = Project.builder().projectId(100L).user(leader).build();
        when(projectRepository.findProjectsBySemester(generateSemester())).thenReturn(List.of(project));
        User user = new User(); user.setId(1L);
        when(applyRepository.findAllBySemester(generateSemester())).thenReturn(List.of(
            ProjectApply.builder().user(user).project(project).position(Position.AI).priority(1).round(2).build()));
    }
    @Test void manualCorrectionIsUsedForThirdRoundAndRepeatAllocationIsRejected() {
        TeamBuildingMeta meta = ready(); candidates();
        FieldClusterMember member = new FieldClusterMember(generateSemester(), 1L, Position.AI);
        when(clusterRepository.findAllBySemesterOrderByUserId(generateSemester())).thenReturn(List.of(member));
        service.updateClusters(Map.of(1L, Position.BACKEND));
        assertThat(member.getPosition()).isEqualTo(Position.BACKEND);
        when(recruitRepository.findAllBySemesterAndRound(generateSemester(), 1)).thenReturn(List.of());
        when(recruitRepository.findAllBySemesterAndRound(generateSemester(), 2)).thenReturn(List.of(
            ProjectRecruit.builder().projectId(100L).position(Position.BACKEND).capacity(1).round(2).build()));
        service.allocate();
        ArgumentCaptor<List<Team>> saved = ArgumentCaptor.forClass(List.class);
        verify(teamRepository).saveAll(saved.capture());
        assertThat(saved.getValue()).singleElement().satisfies(t -> {
            assertThat(t.getMemberId()).isEqualTo(1L);
            assertThat(t.getPosition()).isEqualTo(Position.BACKEND);
            assertThat(t.getRound()).isEqualTo(3);
        });
        assertThat(meta.getCompletedRound()).isEqualTo(3);
        assertThatThrownBy(service::allocate).isInstanceOf(ConflictException.class);
    }
    @Test void rejectsUnknownManualMemberBeforeChangingAnyCluster() {
        ready(); candidates();
        FieldClusterMember member = new FieldClusterMember(generateSemester(), 1L, Position.AI);
        when(clusterRepository.findAllBySemesterOrderByUserId(generateSemester())).thenReturn(List.of(member));
        assertThatThrownBy(() -> service.updateClusters(Map.of(1L, Position.BACKEND, 2L, Position.AI)))
            .isInstanceOf(BadRequestException.class);
        assertThat(member.getPosition()).isEqualTo(Position.AI);
    }
    @Test void requiresClusterGenerationBeforeAllocation() {
        ready(); candidates();
        assertThatThrownBy(service::allocate).isInstanceOf(ConflictException.class);
        verify(teamRepository, never()).saveAll(any());
    }
    @Test void requiresSecondRoundCompletionBeforeRebuilding() {
        when(metaRepository.findBySemesterForUpdate(generateSemester())).thenReturn(Optional.of(
            new TeamBuildingMeta(1L, generateSemester(), TeamBuildingStatus.CLOSED)));
        assertThatThrownBy(service::rebuildClusters).isInstanceOf(ConflictException.class);
        verifyNoInteractions(clusterRepository);
    }
}
