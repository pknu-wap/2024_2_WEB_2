package wap.web2.server.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import wap.web2.server.auth.domain.DevLoginSlot;
import wap.web2.server.exception.ConflictException;
import wap.web2.server.global.security.jwt.TokenProvider;
import wap.web2.server.member.entity.Role;
import wap.web2.server.member.entity.User;
import wap.web2.server.member.repository.UserRepository;

class DevLoginServiceTest {
    private final DevLoginSlotRepository slots = mock(DevLoginSlotRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final TokenProvider tokens = mock(TokenProvider.class);
    private final DevLoginService service = new DevLoginService(slots, users, tokens);
    private final DevLoginSlot first = new DevLoginSlot(1);
    private final DevLoginSlot second = new DevLoginSlot(2);
    private final UUID session = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        when(slots.findAllForUpdate()).thenReturn(List.of(first, second));
        for (var slot : List.of(first, second)) {
            var user = new User();
            user.setId(slot.getSlotNumber().longValue());
            user.setName("테스트 사용자 " + slot.getSlotNumber());
            user.setRole(Role.ROLE_MEMBER);
            slot.setUserId(user.getId());
            when(users.findById(user.getId())).thenReturn(Optional.of(user));
        }
    }

    @Test
    void selectsRequestedAccountAndReusesSessionOnRetry() {
        assertEquals(2, service.login(session, 2).accountNumber());
        String tokenId = second.getTokenId();
        Instant expiry = second.getExpiresAt();
        assertEquals(2, service.login(session, 2).accountNumber());
        assertEquals(tokenId, second.getTokenId());
        assertEquals(expiry, second.getExpiresAt());
        assertNull(first.getSessionId());
        assertEquals(2, service.login(session).accountNumber());
    }

    @Test
    void switchingAccountsReleasesPreviousSlot() {
        assertEquals(1, service.login(session).accountNumber());
        assertEquals(2, service.login(session, 2).accountNumber());
        assertNull(first.getSessionId());
        assertNull(first.getTokenId());
        assertEquals(session.toString(), second.getSessionId());
    }

    @Test
    void occupiedAccountDoesNotStealOrReleaseExistingSession() {
        service.login(session, 1);
        UUID other = UUID.randomUUID();
        service.login(other, 2);
        assertThrows(ConflictException.class, () -> service.login(session, 2));
        assertEquals(session.toString(), first.getSessionId());
        assertEquals(other.toString(), second.getSessionId());
    }

    @Test
    void reclaimsExpiredRequestedAccount() {
        service.login(UUID.randomUUID(), 2);
        String oldTokenId = second.getTokenId();
        second.setExpiresAt(Instant.now().minusSeconds(1));
        assertEquals(2, service.login(session, 2).accountNumber());
        assertEquals(session.toString(), second.getSessionId());
        assertNotEquals(oldTokenId, second.getTokenId());
    }
}
