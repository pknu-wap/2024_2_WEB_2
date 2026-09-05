package wap.web2.server.teambuild.service;

import java.util.*;
import java.util.random.RandomGenerator;
import org.springframework.stereotype.Component;
import wap.web2.server.exception.BadRequestException;
import wap.web2.server.teambuild.entity.Position;
import wap.web2.server.teambuild.service.PositionTeamBuilder.Slot;

@Component
public class RandomFieldTeamBuilder {
    public Map<Slot, Set<Long>> allocate(Map<Long, Position> clusters, Map<Slot, Integer> vacancies,
                                        RandomGenerator random) {
        Map<Slot, Set<Long>> result = new LinkedHashMap<>();
        vacancies.entrySet().stream().sorted(Map.Entry.comparingByKey(
            Comparator.comparing(Slot::projectId).thenComparing(Slot::position)))
            .forEach(entry -> {
                if (entry.getValue() == null || entry.getValue() < 0) {
                    throw new BadRequestException("남은 정원은 0 이상이어야 합니다.");
                }
                result.put(entry.getKey(), new LinkedHashSet<>());
            });
        for (Position position : Position.values()) {
            List<Long> members = new ArrayList<>(clusters.entrySet().stream()
                .filter(e -> e.getValue() == position).map(Map.Entry::getKey).sorted().toList());
            List<Slot> slots = new ArrayList<>(result.keySet().stream()
                .filter(s -> s.position() == position && vacancies.get(s) > 0).toList());
            shuffle(members, random);
            shuffle(slots, random);
            int cursor = 0;
            // Cycle through projects so a single project does not consume the whole field first.
            while (cursor < members.size() && !slots.isEmpty()) {
                Iterator<Slot> iterator = slots.iterator();
                while (iterator.hasNext() && cursor < members.size()) {
                    Slot slot = iterator.next();
                    result.get(slot).add(members.get(cursor++));
                    if (result.get(slot).size() >= vacancies.get(slot)) iterator.remove();
                }
            }
        }
        return result;
    }
    private <T> void shuffle(List<T> values, RandomGenerator random) {
        for (int i = values.size() - 1; i > 0; i--) Collections.swap(values, i, random.nextInt(i + 1));
    }
}
