package wap.web2.server.teambuild.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import wap.web2.server.member.entity.User;
import wap.web2.server.project.entity.Project;
import wap.web2.server.teambuild.dto.TeamMemberResult;
import wap.web2.server.teambuild.dto.response.TeamBuildingResult;
import wap.web2.server.teambuild.dto.response.TeamBuildingResults;
import wap.web2.server.teambuild.entity.Position;
import wap.web2.server.teambuild.entity.ProjectApply;
import wap.web2.server.teambuild.repository.ProjectApplyRepository;

@ExtendWith(MockitoExtension.class)
class TeamBuildingResultServiceTest {

    @Mock
    private ProjectApplyRepository projectApplyRepository;

    @Mock private wap.web2.server.member.repository.UserRepository userRepository;
    @Mock private wap.web2.server.project.repository.ProjectRepository projectRepository;
    @Mock private wap.web2.server.teambuild.repository.TeamRepository teamRepository;

    @Test
    void resultsUseActualAssignedPositionWithoutRequiringAnApplicationToThatProject() {
        User leader = user(1L, "leader");
        User member = user(2L, "member");
        when(projectRepository.findProjectsBySemester(anyString())).thenReturn(List.of(
            Project.builder().projectId(10L).user(leader).build()));
        when(teamRepository.findAllBySemester(anyString())).thenReturn(List.of(
            wap.web2.server.teambuild.entity.Team.builder().projectId(10L).memberId(2L)
                .position(Position.BACKEND).round(3).build()));
        when(userRepository.findAllById(List.of(2L))).thenReturn(List.of(member));
        var result = teamBuildingResultService.getResults();
        assertThat(result.getResults().get(0).getMembers()).containsExactly(
            new TeamMemberResult(2L, "member", Position.BACKEND));
    }

    @InjectMocks
    private TeamBuildingResultService teamBuildingResultService;

    @Test
    @DisplayName("미배정자 계산에서 이미 배정된 팀원과 팀장은 제외된다")
    void getUnassignedMembers_excludesAllocatedMembersAndLeader() {
        // given
        TeamMemberResult leader = TeamMemberResult.builder().id(1L).name("팀장").build();
        TeamMemberResult assignedMember = TeamMemberResult.builder()
            .id(2L)
            .name("팀원")
            .position(Position.AI)
            .build();

        TeamBuildingResults results = new TeamBuildingResults();
        results.add(
            new TeamBuildingResult(140L, "test-title", "summary", leader, List.of(assignedMember))
        );

        Project project = Project.builder().projectId(140L).title("test-title").build();

        ProjectApply leaderApply = apply(
            1L,
            1,
            Position.BACKEND,
            "2026-01",
            user(1L, "팀장"),
            project
        );
        ProjectApply assignedApply = apply(
            2L,
            1,
            Position.AI,
            "2026-01",
            user(2L, "팀원"),
            project
        );
        ProjectApply unassignedApply = apply(
            3L,
            1,
            Position.FRONTEND,
            "2026-01",
            user(3L, "미배정"),
            project
        );

        when(projectApplyRepository.findAllBySemester(anyString())).thenReturn(
            List.of(leaderApply, assignedApply, unassignedApply)
        );

        // when
        List<TeamMemberResult> unassigned = teamBuildingResultService.getUnassignedMembers(results);

        // then
        assertThat(unassigned).hasSize(1);
        assertThat(unassigned.get(0).getId()).isEqualTo(3L);
        assertThat(unassigned.get(0).getName()).isEqualTo("미배정");
    }

    private User user(Long id, String name) {
        User user = new User();
        user.setId(id);
        user.setName(name);
        return user;
    }

    private ProjectApply apply(
        Long id,
        Integer priority,
        Position position,
        String semester,
        User user,
        Project project
    ) {
        return ProjectApply.builder()
            .id(id)
            .priority(priority)
            .position(position)
            .comment("comment")
            .semester(semester)
            .user(user)
            .project(project)
            .build();
    }
}
