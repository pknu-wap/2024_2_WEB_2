package wap.web2.server.admin.repository;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import wap.web2.server.admin.entity.ThirdRoundPositionSlot;
public interface ThirdRoundPositionSlotRepository extends JpaRepository<ThirdRoundPositionSlot, Long> {
    List<ThirdRoundPositionSlot> findAllBySemesterOrderById(String semester);
}
