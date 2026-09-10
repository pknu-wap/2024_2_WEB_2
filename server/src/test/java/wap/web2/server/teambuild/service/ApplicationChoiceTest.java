package wap.web2.server.teambuild.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static wap.web2.server.util.SemesterGenerator.generateSemester;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import wap.web2.server.admin.entity.*;
import wap.web2.server.admin.repository.TeamBuildingMetaRepository;
import wap.web2.server.exception.BadRequestException;
import wap.web2.server.global.security.UserPrincipal;
import wap.web2.server.member.entity.User;
import wap.web2.server.member.repository.UserRepository;
import wap.web2.server.project.entity.Project;
import wap.web2.server.project.entity.RecruitmentPosition;
import wap.web2.server.project.repository.ProjectRepository;
import wap.web2.server.teambuild.dto.request.ProjectAppliesRequest;
import wap.web2.server.teambuild.dto.request.ProjectAppliesRequest.ApplyRequest;
import wap.web2.server.teambuild.dto.response.ProjectAppliesResponse;
import wap.web2.server.teambuild.entity.*;
import wap.web2.server.teambuild.repository.ProjectApplyRepository;

@ExtendWith(MockitoExtension.class)
class ApplicationChoiceTest {
    @Mock TeamBuildingMetaRepository teamBuildingMetaRepository;
    @Mock UserRepository userRepository;
    @Mock ProjectRepository projectRepository;
    @Mock ProjectApplyRepository applyRepository;
    @InjectMocks ApplyService service;

    private UserPrincipal applicant() {
        return applicant(1);
    }

    private UserPrincipal applicant(int round) {
        UserPrincipal principal = mock(UserPrincipal.class);
        when(principal.getId()).thenReturn(1L);
        User user = new User();
        user.setId(1L);
        when(userRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(user));
        when(teamBuildingMetaRepository.findBySemesterForUpdate(generateSemester())).thenReturn(Optional.of(
            new TeamBuildingMeta(round, 0, 1L, generateSemester(), TeamBuildingStatus.APPLY)));
        return principal;
    }

    @Test
    void acceptsFiveProjectPositionPairsAcrossTwoProjects() {
        UserPrincipal principal = applicant();
        when(projectRepository.findById(anyLong())).thenAnswer(i -> Optional.of(
            Project.builder().projectId(i.getArgument(0)).recruitmentPositions(List.of(new RecruitmentPosition("프론트엔드", 3), new RecruitmentPosition("백엔드", 2), new RecruitmentPosition("AI", 1))).build()));
        service.apply(principal, new ProjectAppliesRequest(List.of(
            new ApplyRequest(10L, "frontend", "a"), new ApplyRequest(10L, "backend", "b"),
            new ApplyRequest(20L, "frontend", "c"), new ApplyRequest(20L, "backend", "d"),
            new ApplyRequest(20L, "AI", "e"))), 1);
        ArgumentCaptor<ProjectApply> saved = ArgumentCaptor.forClass(ProjectApply.class);
        verify(applyRepository, times(5)).save(saved.capture());
        assertThat(saved.getAllValues()).extracting(ProjectApply::getPriority).containsExactly(1, 2, 3, 4, 5);
    }

    @Test
    void rejectsDuplicatePairBeforeSavingAnything() {
        UserPrincipal principal = applicant();
        assertThatThrownBy(() -> service.apply(principal, new ProjectAppliesRequest(List.of(
            new ApplyRequest(10L, "frontend", "a"), new ApplyRequest(10L, "FRONTEND", "b"))), 1))
            .isInstanceOf(BadRequestException.class);
        verify(applyRepository, never()).save(any());
    }

    @Test
    void countsPreviouslySubmittedApplicationsInSameRound() {
        UserPrincipal principal = applicant(2);
        ProjectApply existing = ProjectApply.builder().project(Project.builder().projectId(10L).recruitmentPositions(List.of(new RecruitmentPosition("프론트엔드", 3))).build())
            .priority(1).position(Position.AI).build();
        when(applyRepository.findAllByUserIdAndSemesterAndRound(1L, generateSemester(), 2))
            .thenReturn(java.util.Collections.nCopies(5, existing));
        assertThatThrownBy(() -> service.apply(principal, new ProjectAppliesRequest(List.of(
            new ApplyRequest(20L, "AI", "a"))), 2)).isInstanceOf(BadRequestException.class);
        verify(applyRepository, never()).save(any());
    }

    @Test
    void experienceIsSavedAndReturnedWhileCareerRemainsCompatible() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        ProjectAppliesRequest request = mapper.readValue(
            """
            { "applies": [{"projectId":10,"position":"frontend","comment":"a","experience":"React"}] }""",
            ProjectAppliesRequest.class);
        UserPrincipal principal = applicant();
        when(projectRepository.findById(10L)).thenReturn(Optional.of(Project.builder().projectId(10L).recruitmentPositions(List.of(new RecruitmentPosition("프론트엔드", 3))).build()));
        service.apply(principal, request, 1);
        ArgumentCaptor<ProjectApply> saved = ArgumentCaptor.forClass(ProjectApply.class);
        verify(applyRepository).save(saved.capture());
        assertThat(saved.getValue().getCareer()).isEqualTo("React");
        var json = mapper.valueToTree(ProjectAppliesResponse.fromEntities(List.of(saved.getValue())));
        assertThat(json.at("/applies/0/experience").asText()).isEqualTo("React");
        assertThat(json.at("/applies/0/career").asText()).isEqualTo("React");
        assertThat(new ApplyRequest(10L, "AI", "a", "legacy").getExperience()).isEqualTo("legacy");
    }
    @Test
    void rejectsUnrecruitedPositionBeforeSavingAnyApplication() {
        UserPrincipal principal = applicant();
        when(projectRepository.findById(10L)).thenReturn(Optional.of(Project.builder().projectId(10L)
            .recruitmentPositions(List.of(new RecruitmentPosition("백엔드", 2))).build()));
        assertThatThrownBy(() -> service.apply(principal, new ProjectAppliesRequest(List.of(
            new ApplyRequest(10L, "BACKEND", "a"), new ApplyRequest(10L, "FRONTEND", "b"))), 1))
            .isInstanceOf(BadRequestException.class).hasMessageContaining("모집하지 않는 직무");
        verify(applyRepository, never()).save(any());
    }

    @Test
    void rejectsProjectWithoutRecruitmentPositionsInFirstRound() {
        UserPrincipal principal = applicant();
        when(projectRepository.findById(10L)).thenReturn(Optional.of(Project.builder().projectId(10L).build()));
        assertThatThrownBy(() -> service.apply(principal, new ProjectAppliesRequest(List.of(
            new ApplyRequest(10L, "BACKEND", "a"))), 1)).isInstanceOf(BadRequestException.class);
        verify(applyRepository, never()).save(any());
    }

    @Test
    void projectListExposesOnlySupportedRecruitmentPositions() {
        Project project = Project.builder().recruitmentPositions(List.of(
            new RecruitmentPosition("프론트엔드", 3), new RecruitmentPosition("backend", 2),
            new RecruitmentPosition("Server", 1), new RecruitmentPosition("PM", 1),
            new RecruitmentPosition("GAME", 0))).build();
        assertThat(wap.web2.server.teambuild.dto.response.ProjectTemplate.from(project)
            .getFirstRoundRecruitPositions()).containsExactly("FRONTEND", "BACKEND");
    }

}
