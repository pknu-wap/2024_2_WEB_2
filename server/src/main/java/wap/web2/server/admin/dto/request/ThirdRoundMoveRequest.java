package wap.web2.server.admin.dto.request;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
public record ThirdRoundMoveRequest(@NotNull @Min(0) Long revision, @Positive Long teamId) {}
