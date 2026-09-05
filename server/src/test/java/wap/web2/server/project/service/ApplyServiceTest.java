package wap.web2.server.project.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static wap.web2.server.util.SemesterGenerator.generateSemester;

import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import wap.web2.server.admin.entity.TeamBuildingMeta;
import wap.web2.server.admin.entity.TeamBuildingStatus;
import wap.web2.server.admin.repository.TeamBuildingMetaRepository;
import wap.web2.server.exception.ForbiddenException;
import wap.web2.server.global.security.UserPrincipal;
import wap.web2.server.member.entity.User;
import wap.web2.server.member.repository.UserRepository;
import wap.web2.server.project.entity.Project;
import wap.web2.server.project.repository.ProjectRepository;
import wap.web2.server.teambuild.dto.request.ProjectAppliesRequest;
import wap.web2.server.teambuild.dto.request.ProjectAppliesRequest.ApplyRequest;
import wap.web2.server.teambuild.entity.Position;
import wap.web2.server.teambuild.entity.ProjectApply;
import wap.web2.server.teambuild.repository.ProjectApplyRepository;
import wap.web2.server.teambuild.service.ApplyService;

@ExtendWith(MockitoExtension.class)
class ApplyServiceTest {

    @Mock
    TeamBuildingMetaRepository teamBuildingMetaRepository;

    @Mock
    UserRepository userRepository;

    @Mock
    ProjectRepository projectRepository;

    @Mock
    ProjectApplyRepository applyRepository;

    @InjectMocks
    ApplyService applyService;

    @Test
    void 지원서의_priority는_담긴순서대로_1부터_차례대로_증가한다() {
        // given
        UserPrincipal principal = mock(UserPrincipal.class);
        when(principal.getId()).thenReturn(1L);
        when(principal.getName()).thenReturn("tester");

        User user = new User();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        Project p1 = Project.builder().projectId(10L).title("A").build();
        Project p2 = Project.builder().projectId(20L).title("B").build();
        Project p3 = Project.builder().projectId(30L).title("C").build();
        when(projectRepository.findById(10L)).thenReturn(Optional.of(p1));
        when(projectRepository.findById(20L)).thenReturn(Optional.of(p2));
        when(projectRepository.findById(30L)).thenReturn(Optional.of(p3));

        ProjectAppliesRequest request = new ProjectAppliesRequest(
            List.of(
                new ApplyRequest(10L, Position.BACKEND.name(), "열심히할게요."),
                new ApplyRequest(20L, Position.FRONTEND.name(), "열심히할게요."),
                new ApplyRequest(30L, Position.AI.name(), "열심히할게요.")
            )
        );

        when(teamBuildingMetaRepository.findBySemester(generateSemester()))
            .thenReturn(Optional.of(new TeamBuildingMeta(
                1L, generateSemester(),
                TeamBuildingStatus.APPLY)));

        // when
        applyService.apply(principal, request);

        // then
        ArgumentCaptor<ProjectApply> captor = ArgumentCaptor.forClass(ProjectApply.class);
        verify(applyRepository, times(3)).save(captor.capture());

        List<ProjectApply> saved = captor.getAllValues();
        assertThat(saved).extracting(ProjectApply::getPriority).containsExactly(1, 2, 3); // 순서대로 증가했는지 체크
    }

    @Test
    void 해당_프로젝트_팀장이_아닌_인원은_지원을_열람할_수_없다() {
        // given
        UserPrincipal principal = mock(UserPrincipal.class);
        when(principal.getId()).thenReturn(2L);
        // when(principal.getName()).thenReturn("!Owner"); 사용하지 않는 스텁을 남기면 오류가 납니다.. 학습용으로 놔둘게요.

        User owner = new User();
        owner.setId(1L);
        User other = new User();
        other.setId(2L);
        // when(userRepository.findById(1L)).thenReturn(Optional.of(owner));
        when(userRepository.findById(2L)).thenReturn(Optional.of(other));

        Project project = Project.builder()
            .projectId(1L)
            .title("테스트프로젝트")
            .user(owner)
            .build();
        when(projectRepository.findById(1L)).thenReturn(Optional.of(project));

        // when & then
        assertThatThrownBy(() -> applyService.getApplies(principal, 1L)).isInstanceOf(
            ForbiddenException.class
        );
    }
}
