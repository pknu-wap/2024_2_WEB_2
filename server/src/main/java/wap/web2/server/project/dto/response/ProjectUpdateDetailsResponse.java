package wap.web2.server.project.dto.response;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import wap.web2.server.comment.dto.CommentDto;
import wap.web2.server.project.dto.RecruitmentPositionDto;
import wap.web2.server.project.dto.TeamMemberDto;
import wap.web2.server.project.entity.Project;

@Builder
@AllArgsConstructor
@Getter
public class ProjectUpdateDetailsResponse {

    private List<RecruitmentPositionDto> recruitmentPositions;
    private Long projectId;
    private String title;
    private String projectType;
    private String content;
    private String summary;
    private String semester;
    private List<TeamMemberDto> teamMember;
    private List<CommentDto> comments;

    public static ProjectUpdateDetailsResponse from(Project project) {
        List<TeamMemberDto> teamMembers = project
            .getTeamMembers()
            .stream()
            .map(TeamMemberDto::from)
            .toList();
        List<CommentDto> comments = project.getComments().stream().map(CommentDto::from).toList();

        return ProjectUpdateDetailsResponse.builder()
            .recruitmentPositions(project.getRecruitmentPositions().stream().map(RecruitmentPositionDto::from).toList())
            .projectId(project.getProjectId())
            .title(project.getTitle())
            .projectType(project.getProjectType())
            .content(project.getContent())
            .summary(project.getSummary())
            .semester(project.getSemester())
            .teamMember(teamMembers)
            .comments(comments)
            .build();
    }
}
