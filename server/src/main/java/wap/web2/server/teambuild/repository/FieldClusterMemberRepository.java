package wap.web2.server.teambuild.repository;

import java.util.List;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import wap.web2.server.teambuild.entity.FieldClusterMember;

public interface FieldClusterMemberRepository extends JpaRepository<FieldClusterMember, Long> {
    List<FieldClusterMember> findAllBySemesterOrderByUserId(String semester);
    @Modifying
    @Query("DELETE FROM FieldClusterMember c WHERE c.semester = :semester")
    void deleteBySemester(@Param("semester") String semester);
}
