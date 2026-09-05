package wap.web2.server.teambuild.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static wap.web2.server.util.SemesterGenerator.generateSemester;

import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import wap.web2.server.admin.entity.TeamBuildingMeta;
import wap.web2.server.admin.entity.TeamBuildingStatus;
import wap.web2.server.admin.repository.TeamBuildingMetaRepository;
import wap.web2.server.exception.BadRequestException;
import wap.web2.server.exception.ConflictException;
import wap.web2.server.global.security.UserPrincipal;
import wap.web2.server.member.entity.User;
import wap.web2.server.member.repository.UserRepository;
import wap.web2.server.project.entity.Project;
import wap.web2.server.project.repository.ProjectRepository;
import wap.web2.server.teambuild.dto.RecruitmentDto;
import wap.web2.server.teambuild.dto.request.ProjectAppliesRequest;
import wap.web2.server.teambuild.entity.ProjectApply;
import wap.web2.server.teambuild.entity.ProjectRecruit;
import wap.web2.server.teambuild.repository.ProjectApplyRepository;
import wap.web2.server.teambuild.repository.ProjectRecruitRepository;
import wap.web2.server.teambuild.repository.ProjectRecruitWishRepository;

@ExtendWith(MockitoExtension.class)
class ApplyRoundTest {
    @Mock TeamBuildingMetaRepository teamBuildingMetaRepository;
    @Mock ProjectRecruitWishRepository recruitWishRepository;
    @Mock ProjectRecruitRepository recruitRepository;
    @Mock ProjectApplyRepository applyRepository;
    @Mock ProjectRepository projectRepository;
    @Mock UserRepository userRepository;
    @InjectMocks ApplyService service;

    UserPrincipal principal;
    Project project;

    @BeforeEach
    void setup() {
        principal = mock(UserPrincipal.class);
    }

    private void owner() {
        User user = new User();
        user.setId(1L);
        when(principal.getId()).thenReturn(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        project = Project.builder().projectId(10L).user(user).build();
        when(projectRepository.findById(10L)).thenReturn(Optional.of(project));
    }

    private void status(TeamBuildingStatus status) {
        when(teamBuildingMetaRepository.findBySemester(generateSemester()))
            .thenReturn(Optional.of(new TeamBuildingMeta(1L, generateSemester(), status)));
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 2})
    void savesApplicationInRequestedRound(int round) {
        owner();
        status(TeamBuildingStatus.APPLY);
        service.apply(principal, new ProjectAppliesRequest(List.of(
            new ProjectAppliesRequest.ApplyRequest(10L, "BACKEND", "comment"))), round);
        ArgumentCaptor<ProjectApply> captor = ArgumentCaptor.forClass(ProjectApply.class);
        verify(applyRepository).save(captor.capture());
        assertThat(captor.getValue().getRound()).isEqualTo(round);
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 2})
    void savesRecruitmentInRequestedRound(int round) {
        owner();
        status(TeamBuildingStatus.RECRUIT);
        when(recruitRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        service.setPreference(principal, new RecruitmentDto(10L, List.of(
            new RecruitmentDto.RecruitmentInfo(2, "BACKEND", List.of()))), round);
        ArgumentCaptor<ProjectRecruit> captor = ArgumentCaptor.forClass(ProjectRecruit.class);
        verify(recruitRepository).save(captor.capture());
        assertThat(captor.getValue().getRound()).isEqualTo(round);
    }

    @Test
    void firstRoundRecruitmentDoesNotBlockSecondRoundPage() {
        owner();
        when(recruitRepository.existsByProjectIdAndSemesterAndRound(10L, generateSemester(), 1))
            .thenReturn(true);
        when(applyRepository.findAllByProjectAndSemesterAndRound(project, generateSemester(), 2))
            .thenReturn(List.of());
        assertThatThrownBy(() -> service.getRecruitPageData(principal, 10L, 1))
            .isInstanceOf(ConflictException.class);
        service.getRecruitPageData(principal, 10L, 2);
        verify(applyRepository).findAllByProjectAndSemesterAndRound(project, generateSemester(), 2);
        verify(applyRepository, never()).findAllByProject(any());
    }

    @ParameterizedTest
    @ValueSource(ints = {-1, 0, 3, 100})
    void rejectsUnsupportedRoundsBeforeAccessingData(int round) {
        assertThatThrownBy(() -> service.apply(principal, null, round)).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.setPreference(principal, null, round)).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.getRecruitPageData(principal, 10L, round)).isInstanceOf(BadRequestException.class);
        verifyNoInteractions(teamBuildingMetaRepository, userRepository, applyRepository, recruitRepository);
    }

    @Test
    void legacyPageUsesFirstRound() {
        owner();
        when(applyRepository.findAllByProjectAndSemesterAndRound(project, generateSemester(), 1))
            .thenReturn(List.of());
        service.getRecruitPageData(principal, 10L);
        verify(recruitRepository).existsByProjectIdAndSemesterAndRound(10L, generateSemester(), 1);
        verify(applyRepository).findAllByProjectAndSemesterAndRound(project, generateSemester(), 1);
        assertThat(ProjectApply.builder().build().getRound()).isEqualTo(1);
        assertThat(ProjectRecruit.builder().build().getRound()).isEqualTo(1);
    }
}
