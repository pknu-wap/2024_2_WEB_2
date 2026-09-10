package wap.web2.server.admin.dto.request;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
public record ThirdRoundRevisionRequest(@NotNull @Min(0) Long revision) {}
