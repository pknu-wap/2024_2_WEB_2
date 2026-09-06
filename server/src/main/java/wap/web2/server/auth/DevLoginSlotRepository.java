package wap.web2.server.auth;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import wap.web2.server.auth.domain.DevLoginSlot;

public interface DevLoginSlotRepository extends JpaRepository<DevLoginSlot, Integer> {
    // A fixed lock order serializes allocation across server instances.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM DevLoginSlot s ORDER BY s.slotNumber")
    List<DevLoginSlot> findAllForUpdate();

    boolean existsByTokenIdAndUserIdAndExpiresAtAfter(String tokenId, Long userId, Instant now);
}
