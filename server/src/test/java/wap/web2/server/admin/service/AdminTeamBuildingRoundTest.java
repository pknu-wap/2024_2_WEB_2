package wap.web2.server.admin.service;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static wap.web2.server.util.SemesterGenerator.generateSemester;

import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import wap.web2.server.admin.entity.TeamBuildingMeta;
import wap.web2.server.admin.entity.TeamBuildingStatus;
import wap.web2.server.admin.repository.TeamBuildingMetaRepository;
import wap.web2.server.member.entity.User;
import wap.web2.server.project.entity.Project;
import wap.web2.server.project.repository.ProjectRepository;
import wap.web2.server.teambuild.entity.Position;
import wap.web2.server.teambuild.entity.ProjectApply;
import wap.web2.server.teambuild.repository.ProjectApplyRepository;
import wap.web2.server.teambuild.repository.ProjectRecruitRepository;
import wap.web2.server.teambuild.repository.TeamRepository;
import wap.web2.server.teambuild.service.TeamBuilder;

@ExtendWith(MockitoExtension.class)
class AdminTeamBuildingRoundTest {
    @Mock TeamBuildingMetaRepository teamBuildingMetaRepository;
    @Mock ProjectRecruitRepository recruitRepository;
    @Mock ProjectApplyRepository applyRepository;
    @Mock ProjectRepository projectRepository;
    @Mock TeamRepository teamRepository;
    @Mock TeamBuilder teamBuilder;
    @InjectMocks AdminTeamBuildingService service;

    @Test
    void existingAllocationReadsOnlyFirstRoundApplicationsAndRecruitments() {
        String semester = generateSemester();
        when(teamBuildingMetaRepository.findBySemester(semester)).thenReturn(Optional.of(
            new TeamBuildingMeta(1L, semester, TeamBuildingStatus.CLOSED)));
        User user = new User();
        user.setId(1L);
        Project project = Project.builder().projectId(10L).build();
        for (Position position : Position.values()) {
            when(applyRepository.findAllBySemesterAndRoundAndPosition(semester, 1, position))
                .thenReturn(List.of(ProjectApply.builder().user(user).project(project)
                    .priority(1).position(position).build()));
        }

        service.makeTeam();

        for (Position position : Position.values()) {
            verify(applyRepository).findAllBySemesterAndRoundAndPosition(semester, 1, position);
            verify(recruitRepository).findAllBySemesterAndRoundAndPosition(semester, 1, position);
        }
    }
}
