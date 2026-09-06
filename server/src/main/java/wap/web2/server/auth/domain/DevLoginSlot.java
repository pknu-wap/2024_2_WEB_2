package wap.web2.server.auth.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class DevLoginSlot {
    @Id
    private Integer slotNumber;
    private Long userId;
    private String sessionId;
    private String tokenId;
    private Instant expiresAt;

    public DevLoginSlot(int slotNumber) {
        this.slotNumber = slotNumber;
    }

    public boolean isAvailable(Instant now) {
        return expiresAt == null || !expiresAt.isAfter(now);
    }

    public void release() {
        sessionId = null;
        tokenId = null;
        expiresAt = null;
    }
}
