package wap.web2.server.admin.repository;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import wap.web2.server.admin.entity.ThirdRoundPlanTeam;
public interface ThirdRoundPlanTeamRepository extends JpaRepository<ThirdRoundPlanTeam, Long> {
    List<ThirdRoundPlanTeam> findAllBySemesterOrderById(String semester);
}
