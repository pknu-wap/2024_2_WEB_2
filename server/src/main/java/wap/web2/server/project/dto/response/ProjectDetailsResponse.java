package wap.web2.server.project.dto.response;

import java.util.List;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import wap.web2.server.comment.dto.CommentDto;
import wap.web2.server.project.dto.ImageDto;
import wap.web2.server.project.dto.TeamMemberDto;
import wap.web2.server.project.dto.TechStackDto;
import wap.web2.server.project.entity.Project;

@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class ProjectDetailsResponse {

    private Long projectId;
    private String title;
    private String projectType;
    private String content;
    private String summary;
    private String semester;
    private String thumbnail;
    private List<TeamMemberDto> teamMember;
    private List<TechStackDto> techStack;
    private List<ImageDto> images;
    private List<CommentDto> comments;
    private Boolean isOwner;
    private Boolean canManage;

    public static ProjectDetailsResponse from(Project project) {
        List<TeamMemberDto> teamMembers = project
            .getTeamMembers()
            .stream()
            .map(TeamMemberDto::from)
            .toList();
        List<ImageDto> images = project.getImages().stream().map(ImageDto::from).toList();
        List<TechStackDto> techStacks = project
            .getTechStacks()
            .stream()
            .map(TechStackDto::from)
            .toList();
        List<CommentDto> comments = project.getComments().stream().map(CommentDto::from).toList();

        return ProjectDetailsResponse.builder()
            .projectId(project.getProjectId())
            .title(project.getTitle())
            .projectType(project.getProjectType())
            .content(project.getContent())
            .summary(project.getSummary())
            .semester(project.getSemester())
            .thumbnail(project.getThumbnail())
            .teamMember(teamMembers)
            .techStack(techStacks)
            .images(images)
            .comments(comments)
            .isOwner(false)
            .canManage(false)
            .build();
    }

    public ProjectDetailsResponse changeCanManage(boolean canManage) {
        this.canManage = canManage;
        return this;
    }

    public ProjectDetailsResponse changeIsOwner(boolean isOwner) {
        this.isOwner = isOwner;
        return this;
    }
}
