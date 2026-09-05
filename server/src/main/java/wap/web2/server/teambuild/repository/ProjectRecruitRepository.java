package wap.web2.server.teambuild.repository;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import wap.web2.server.teambuild.entity.Position;
import wap.web2.server.teambuild.entity.ProjectRecruit;

@Repository
public interface ProjectRecruitRepository extends JpaRepository<ProjectRecruit, Long> {
    Boolean existsByProjectIdAndSemester(Long projectId, String semester);

    boolean existsByProjectIdAndSemesterAndRound(Long projectId, String semester, int round);

    List<ProjectRecruit> findAllBySemesterAndRoundAndPosition(String semester, int round, Position position);

    Page<ProjectRecruit> findAllBySemester(String semester, PageRequest of);
}
