package wap.web2.server.teambuild.service;

import java.util.*;
import org.springframework.stereotype.Component;
import wap.web2.server.teambuild.entity.*;

/** Leader-proposing allocation over (project, position) slots with one assignment per person. */
@Component
public class PositionTeamBuilder {
    public record Slot(Long projectId, Position position) {}

    public Map<Slot, Set<Long>> allocate(List<ProjectApply> applies, List<ProjectRecruit> recruits,
                                        Set<Long> excluded) {
        Comparator<Slot> order = Comparator.comparing(Slot::projectId).thenComparing(Slot::position);
        Map<Slot, Map<Long, Integer>> ranks = new HashMap<>();
        for (ProjectApply apply : applies) {
            ranks.computeIfAbsent(new Slot(apply.getProject().getProjectId(), apply.getPosition()),
                key -> new HashMap<>()).merge(apply.getUser().getId(), apply.getPriority(), Math::min);
        }
        Map<Slot, Integer> capacities = new TreeMap<>(order);
        Map<Slot, List<Long>> candidates = new HashMap<>();
        for (ProjectRecruit recruit : recruits) {
            Slot slot = new Slot(recruit.getProjectId(), recruit.getPosition());
            capacities.put(slot, Math.max(0, recruit.getCapacity()));
            candidates.put(slot, recruit.getWishList().stream()
                .sorted(Comparator.comparing(ProjectRecruitWish::getPriority)
                    .thenComparing(ProjectRecruitWish::getApplicantId))
                .map(ProjectRecruitWish::getApplicantId).distinct()
                .filter(id -> !excluded.contains(id) && ranks.getOrDefault(slot, Map.of()).containsKey(id))
                .toList());
        }
        Map<Slot, Set<Long>> result = new LinkedHashMap<>();
        capacities.keySet().forEach(slot -> result.put(slot, new LinkedHashSet<>()));
        Map<Long, Slot> assigned = new HashMap<>();
        Map<Slot, Integer> cursors = new HashMap<>();
        Deque<Slot> pending = new ArrayDeque<>(capacities.keySet());
        while (!pending.isEmpty()) {
            Slot slot = pending.removeFirst();
            List<Long> wishes = candidates.get(slot);
            int cursor = cursors.getOrDefault(slot, 0);
            while (result.get(slot).size() < capacities.get(slot) && cursor < wishes.size()) {
                Long id = wishes.get(cursor++);
                Slot previous = assigned.get(id);
                boolean preferred = previous == null || ranks.get(slot).get(id) < ranks.get(previous).get(id)
                    || (ranks.get(slot).get(id).equals(ranks.get(previous).get(id)) && order.compare(slot, previous) < 0);
                if (preferred) {
                    if (previous != null) {
                        result.get(previous).remove(id);
                        pending.addLast(previous);
                    }
                    result.get(slot).add(id);
                    assigned.put(id, slot);
                }
            }
            cursors.put(slot, cursor);
        }
        return result;
    }
}
