package wap.web2.server.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Profile("develop")
@RequiredArgsConstructor
public class DevLoginController {
    private final DevLoginService service;

    @PostMapping("/auth/login-dev")
    public DevLoginService.DevLoginResponse login(@Valid @RequestBody LoginRequest request) {
        return service.login(request.sessionId(), request.accountNumber());
    }

    @PostMapping("/auth/login-dev/release")
    public ResponseEntity<Void> release(@Valid @RequestBody SessionRequest request) {
        service.release(request.sessionId());
        return ResponseEntity.noContent().build();
    }

    public record LoginRequest(@NotNull UUID sessionId, @Min(1) @Max(100) Integer accountNumber) {}

    public record SessionRequest(@NotNull UUID sessionId) {}
}
