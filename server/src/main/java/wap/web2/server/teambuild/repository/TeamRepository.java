package wap.web2.server.teambuild.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import wap.web2.server.teambuild.entity.Team;

@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {
    List<Team> findAllBySemester(String semester);

    List<Team> findAllByProjectIdAndSemesterAndRoundOrderByIdAsc(Long projectId, String semester, int round);

    void deleteBySemester(String semester);
}
