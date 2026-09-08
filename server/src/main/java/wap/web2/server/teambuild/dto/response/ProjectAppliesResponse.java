package wap.web2.server.teambuild.dto.response;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import wap.web2.server.teambuild.entity.ProjectApply;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ProjectAppliesResponse {

    private List<ApplyResponse> applies;

    private List<RecruitedMemberResponse> recruitedMembers = List.of();

    public ProjectAppliesResponse(List<ApplyResponse> applies) {
        this.applies = applies;
    }

    @Getter
    @AllArgsConstructor
    public static class RecruitedMemberResponse {
        private Long memberId;
        private String memberName;
        private String position;
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApplyResponse {

        private Long projectId;
        private String position;
        private String comment;
        private String career;

        public String getExperience() {
            return career;
        }
        private String applicantName;
        private Long applicantId;
    }

    public static ProjectAppliesResponse fromEntities(List<ProjectApply> entities) {
        List<ApplyResponse> responses = entities.stream()
                .map(apply -> new ApplyResponse(
                        apply.getProject().getProjectId(),
                        apply.getPosition().toString(),
                        apply.getComment(),
                        apply.getCareer(),
                        apply.getUser().getName(),
                        apply.getUser().getId()
                ))
                .toList();

        return new ProjectAppliesResponse(responses);
    }
}
