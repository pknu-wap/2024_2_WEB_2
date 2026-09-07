package wap.web2.server.project.repository;

import java.util.List;
import java.util.Set;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import wap.web2.server.project.entity.Project;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findProjectsBySemester(String semester);

    List<Project> findAllByUser_IdAndSemesterOrderByProjectIdDesc(Long userId, String semester);

    List<Project> findProjectsBySemesterOrderByProjectIdDesc(String semester);

    @Query("SELECT p.projectId FROM Project p WHERE p.projectId IN :projectIds")
    List<Long> findExistingProjectIds(@Param("projectIds") Set<Long> projectIds);
}
