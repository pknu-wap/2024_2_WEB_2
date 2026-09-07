package wap.web2.server.auth;

import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("develop")
@RequiredArgsConstructor
public class DevLoginSessionValidator {
    private final DevLoginSlotRepository slots;

    public boolean isActive(String tokenId, Long userId) {
        return tokenId != null && slots.existsByTokenIdAndUserIdAndExpiresAtAfter(tokenId, userId, Instant.now());
    }
}
