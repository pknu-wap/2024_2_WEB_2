package wap.web2.server.admin.repository;

import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import wap.web2.server.admin.entity.TeamBuildingMeta;
import wap.web2.server.admin.entity.TeamBuildingStatus;

public interface TeamBuildingMetaRepository extends JpaRepository<TeamBuildingMeta, Long> {
    @Modifying
    @Query("UPDATE TeamBuildingMeta t SET t.status = :status WHERE t.semester = :semester")
    int updateTeamBuildingMetaStatus(
        @Param("semester") String semester,
        @Param("status") TeamBuildingStatus status
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM TeamBuildingMeta t WHERE t.semester = :semester")
    Optional<TeamBuildingMeta> findBySemesterForUpdate(@Param("semester") String semester);

    Optional<TeamBuildingMeta> findBySemester(String semester);

    boolean existsTeamBuildingMetaBySemester(String semester);
}
