package wap.web2.server.teambuild.service;

import java.util.List;
import wap.web2.server.project.entity.Project;
import wap.web2.server.teambuild.entity.Position;

public final class ProjectApplicationPositions {
    private ProjectApplicationPositions() {}

    public static List<Position> firstRound(Project project) {
        return project.getRecruitmentPositions().stream()
            .filter(position -> position.getCount() != null && position.getCount() > 0)
            .flatMap(position -> Position.fromRecruitmentRole(position.getRole()).stream())
            .distinct()
            .toList();
    }
}
