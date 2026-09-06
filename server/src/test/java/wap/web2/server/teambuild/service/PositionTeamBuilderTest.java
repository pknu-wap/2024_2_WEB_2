package wap.web2.server.teambuild.service;

import static org.assertj.core.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import wap.web2.server.member.entity.User;
import wap.web2.server.project.entity.Project;
import wap.web2.server.teambuild.entity.*;

class PositionTeamBuilderTest {
    private ProjectApply apply(long userId, long projectId, Position position, int priority) {
        User user = new User(); user.setId(userId);
        return ProjectApply.builder().user(user).project(Project.builder().projectId(projectId).build())
            .position(position).priority(priority).build();
    }
    private ProjectRecruit recruit(long projectId, Position position, Long... ids) {
        List<ProjectRecruitWish> wishes = new ArrayList<>();
        for (Long id : ids) wishes.add(ProjectRecruitWish.builder().applicantId(id).priority(wishes.size() + 1).build());
        return ProjectRecruit.builder().projectId(projectId).position(position).capacity(1).wishList(wishes).build();
    }
    @Test void resolvesCrossPositionDuplicatesAndBackfillsVacanciesUsingApplicantPriority() {
        List<ProjectApply> applies = List.of(apply(1, 10, Position.AI, 2), apply(1, 10, Position.BACKEND, 1),
            apply(2, 10, Position.AI, 1), apply(3, 20, Position.AI, 1));
        List<ProjectRecruit> recruits = List.of(recruit(10, Position.AI, 1L, 2L),
            recruit(10, Position.BACKEND, 1L), recruit(20, Position.AI, 3L));
        var result = new PositionTeamBuilder().allocate(applies, recruits, Set.of(3L));
        assertThat(result.get(new PositionTeamBuilder.Slot(10L, Position.AI))).containsExactly(2L);
        assertThat(result.get(new PositionTeamBuilder.Slot(10L, Position.BACKEND))).containsExactly(1L);
        assertThat(result.get(new PositionTeamBuilder.Slot(20L, Position.AI))).isEmpty();
        assertThat(recruits.get(0).getWishList()).hasSize(2);
        List<ProjectApply> reversed = new ArrayList<>(applies); Collections.reverse(reversed);
        assertThat(new PositionTeamBuilder().allocate(reversed, recruits, Set.of(3L))).isEqualTo(result);
    }
    @Test void neverAllocatesSomeoneWithoutAnApplicationForTheSelectedPosition() {
        var result = new PositionTeamBuilder().allocate(List.of(apply(1, 10, Position.AI, 1)),
            List.of(recruit(10, Position.BACKEND, 1L)), Set.of());
        assertThat(result.values()).allMatch(Set::isEmpty);
    }
}
