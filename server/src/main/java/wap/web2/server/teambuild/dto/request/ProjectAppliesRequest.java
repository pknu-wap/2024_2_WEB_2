package wap.web2.server.teambuild.dto.request;

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
    @Size(min = 1, max = 5, message = "지원은 1개 이상 5개 이하만 가능합니다.")
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
        @Size(max = 120)
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
