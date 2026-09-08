package wap.web2.server.teambuild.dto.request;

import static wap.web2.server.teambuild.service.ApplicationPolicy.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Getter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class ProjectAppliesRequest {

    @NotNull
    @Size(min = MIN_APPLICATIONS_PER_REQUEST, max = MAX_APPLICATIONS_PER_ROUND,
        message = "지원은 {min}개 이상 {max}개 이하만 가능합니다.")
    private List<@Valid ApplyRequest> applies;

    @Getter
    @ToString
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApplyRequest {

        @NotNull
        private Long projectId;

        @NotBlank
        @Size(max = 32)
        private String position;

        @NotBlank
        @Size(max = MAX_MESSAGE_LENGTH)
        private String comment;

        private String career;

        private String experience;

        public ApplyRequest(Long projectId, String position, String comment, String career) {
            this(projectId, position, comment, career, null);
        }

        public String getExperience() {
            return experience != null ? experience : career;
        }

        public ApplyRequest(Long projectId, String position, String comment) {
            this(projectId, position, comment, null);
        }
    }
}
