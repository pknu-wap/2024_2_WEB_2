package wap.web2.server.teambuild.service;

import java.util.*;
import org.springframework.stereotype.Component;
import wap.web2.server.teambuild.entity.*;

/** Latest-round first choice determines each unassigned applicant's initial field. */
@Component
public class FieldClusterer {
    public Map<Long, Position> cluster(List<ProjectApply> applies, Set<Long> excluded) {
        Comparator<ProjectApply> preference = Comparator.comparingInt(ProjectApply::getRound).reversed()
            .thenComparing(ProjectApply::getPriority).thenComparing(ProjectApply::getPosition)
            .thenComparing(a -> a.getProject().getProjectId());
        Map<Long, ProjectApply> choices = new TreeMap<>();
        for (ProjectApply apply : applies) {
            Long id = apply.getUser().getId();
            if (!excluded.contains(id)) choices.merge(id, apply,
                (left, right) -> preference.compare(left, right) <= 0 ? left : right);
        }
        Map<Long, Position> clusters = new LinkedHashMap<>();
        choices.forEach((id, apply) -> clusters.put(id, apply.getPosition()));
        return clusters;
    }
}
