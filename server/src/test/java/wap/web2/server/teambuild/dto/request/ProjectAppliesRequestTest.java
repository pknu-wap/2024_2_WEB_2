package wap.web2.server.teambuild.dto.request;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Validation;
import java.util.List;
import org.junit.jupiter.api.Test;

class ProjectAppliesRequestTest {
    @Test void acceptsSixtyCharactersAndRejectsSixtyOne() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            var accepted = new ProjectAppliesRequest(List.of(
                new ProjectAppliesRequest.ApplyRequest(1L, "BACKEND", "가".repeat(60))));
            var rejected = new ProjectAppliesRequest(List.of(
                new ProjectAppliesRequest.ApplyRequest(1L, "BACKEND", "가".repeat(61))));
            assertThat(validator.validate(accepted)).isEmpty();
            assertThat(validator.validate(rejected)).anySatisfy(violation ->
                assertThat(violation.getPropertyPath().toString()).isEqualTo("applies[0].comment"));
        }
    }
}
