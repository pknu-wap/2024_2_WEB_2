package wap.web2.server.teambuild.service;

import static org.assertj.core.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import wap.web2.server.member.entity.User;
import wap.web2.server.project.entity.Project;
import wap.web2.server.teambuild.entity.*;
import wap.web2.server.teambuild.service.PositionTeamBuilder.Slot;

class FieldClusteringTest {
    private ProjectApply apply(long id, int round, int priority, Position position) {
        User user = new User(); user.setId(id);
        return ProjectApply.builder().user(user).project(Project.builder().projectId(10L).build())
            .round(round).priority(priority).position(position).build();
    }
    @Test void clusteringIsOrderIndependentAndPrefersLatestRoundThenFirstChoice() {
        List<ProjectApply> applies = new ArrayList<>(List.of(apply(1, 1, 1, Position.AI),
            apply(1, 2, 2, Position.BACKEND), apply(1, 2, 1, Position.FRONTEND),
            apply(2, 1, 1, Position.AI), apply(3, 1, 1, Position.AI)));
        var expected = Map.of(1L, Position.FRONTEND, 2L, Position.AI);
        assertThat(new FieldClusterer().cluster(applies, Set.of(3L))).isEqualTo(expected);
        Collections.reverse(applies);
        assertThat(new FieldClusterer().cluster(applies, Set.of(3L))).isEqualTo(expected);
    }
    @Test void randomAllocationRespectsFieldsCapacitiesAndUniqueMembership() {
        Map<Long, Position> clusters = new HashMap<>();
        for (long i = 1; i <= 20; i++) clusters.put(i, i <= 10 ? Position.AI : Position.BACKEND);
        Map<Slot, Integer> vacancies = Map.of(new Slot(10L, Position.AI), 3,
            new Slot(20L, Position.AI), 3, new Slot(10L, Position.BACKEND), 2);
        Set<Map<Slot, Set<Long>>> outcomes = new HashSet<>();
        for (int seed = 0; seed < 20; seed++) {
            var allocation = new RandomFieldTeamBuilder().allocate(clusters, vacancies, new Random(seed));
            outcomes.add(allocation);
            Set<Long> selected = new HashSet<>();
            allocation.forEach((slot, ids) -> {
                assertThat(ids).hasSize(vacancies.get(slot));
                ids.forEach(id -> {
                    assertThat(selected.add(id)).isTrue();
                    assertThat(clusters.get(id)).isEqualTo(slot.position());
                });
            });
        }
        assertThat(outcomes.size()).isGreaterThan(1);
    }
}
