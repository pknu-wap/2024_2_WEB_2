package wap.web2.server.auth;

import static wap.web2.server.auth.DevLoginPolicy.*;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import wap.web2.server.auth.domain.DevLoginSlot;
import wap.web2.server.exception.ConflictException;
import wap.web2.server.global.security.UserPrincipal;
import wap.web2.server.global.security.jwt.TokenProvider;
import wap.web2.server.member.entity.AuthProvider;
import wap.web2.server.member.entity.Role;
import wap.web2.server.member.entity.User;
import wap.web2.server.member.repository.UserRepository;

@Service
@Profile("develop")
@RequiredArgsConstructor
public class DevLoginService {
    private final DevLoginSlotRepository slots;
    private final UserRepository users;
    private final TokenProvider tokens;

    @Transactional
    public DevLoginResponse login(UUID sessionId) {
        return login(sessionId, null);
    }

    @Transactional
    public DevLoginResponse login(UUID sessionId, Integer accountNumber) {
        var pool = slots.findAllForUpdate();
        var now = Instant.now();
        String session = sessionId.toString();
        var slot = accountNumber == null ? pool.stream()
            .filter(s -> session.equals(s.getSessionId()) && !s.isAvailable(now))
            .findFirst()
            .orElseGet(() -> pool.stream().filter(s -> s.isAvailable(now)).findFirst()
                .orElseThrow(() -> new ConflictException("테스트 계정 " + DEV_ACCOUNT_COUNT + "개가 모두 사용 중입니다. 잠시 후 다시 시도해주세요.")))
            : pool.stream().filter(s -> s.getSlotNumber().equals(accountNumber)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("테스트 계정 번호는 " + MIN_DEV_ACCOUNT_NUMBER + "~" + MAX_DEV_ACCOUNT_NUMBER + "이어야 합니다."));

        if (!slot.isAvailable(now) && !session.equals(slot.getSessionId())) {
            throw new ConflictException("테스트 계정 " + accountNumber + "번이 사용 중입니다. 다른 계정을 선택해주세요.");
        }

        // Retrying the same request must not consume another account.
        if (slot.isAvailable(now)) {
            pool.stream().filter(s -> session.equals(s.getSessionId())).forEach(DevLoginSlot::release);
            slots.flush();
            slot.setSessionId(session);
            slot.setTokenId(UUID.randomUUID().toString());
            slot.setExpiresAt(now.plus(Duration.ofHours(1)));
        }
        var user = getOrCreateUser(slot);
        var principal = UserPrincipal.create(user);
        var auth = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        return new DevLoginResponse(
            tokens.createDevToken(auth, slot.getTokenId(), slot.getExpiresAt()),
            user.getName(), user.getRole(), slot.getSlotNumber(), slot.getExpiresAt()
        );
    }

    @Transactional
    public void release(UUID sessionId) {
        slots.findAllForUpdate().stream()
            .filter(s -> sessionId.toString().equals(s.getSessionId()))
            .forEach(DevLoginSlot::release);
    }

    private User getOrCreateUser(DevLoginSlot slot) {
        if (slot.getUserId() != null) return users.findById(slot.getUserId()).orElseThrow();
        String email = "dev-login-" + slot.getSlotNumber() + "@waps.invalid";
        if (users.existsByEmail(email)) {
            throw new ConflictException("테스트 계정 이메일이 이미 사용 중입니다. 관리자에게 문의해주세요.");
        }
        var user = new User();
        user.setName("테스트 사용자 " + slot.getSlotNumber());
        user.setEmail(email);
        user.setProvider(AuthProvider.local);
        user.setProviderId("dev-login:" + slot.getSlotNumber());
        user.setRole(Role.ROLE_MEMBER);
        user = users.saveAndFlush(user);
        slot.setUserId(user.getId());
        return user;
    }

    public record DevLoginResponse(
        String accessToken, String userName, Role role, int accountNumber, Instant expiresAt
    ) {}
}
