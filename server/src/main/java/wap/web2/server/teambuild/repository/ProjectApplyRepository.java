package wap.web2.server.teambuild.repository;

import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import wap.web2.server.project.entity.Project;
import wap.web2.server.teambuild.entity.Position;
import wap.web2.server.teambuild.entity.ProjectApply;

@Repository
public interface ProjectApplyRepository extends JpaRepository<ProjectApply, Long> {
    List<ProjectApply> findAllByProject(Project project);

    List<ProjectApply> findAllByProjectAndSemesterAndRound(Project project, String semester, int round);

    List<ProjectApply> findAllBySemesterAndRoundAndPosition(String semester, int round, Position position);

    List<ProjectApply> findByProject_ProjectIdAndSemesterAndUser_IdInOrderByPriorityAsc(
        Long projectId,
        String semester,
        Collection<Long> userIds
    );

    boolean existsByUserIdAndSemester(Long userId, String semester);

    Page<ProjectApply> findAllBySemester(String semester, Pageable pageable);

    List<ProjectApply> findAllBySemester(String semester);
}
