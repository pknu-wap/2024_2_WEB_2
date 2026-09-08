package wap.web2.server.teambuild.service;

import static org.assertj.core.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import wap.web2.server.exception.BadRequestException;
import wap.web2.server.member.entity.User;
import wap.web2.server.teambuild.dto.RecruitmentDto.RecruitmentInfo;
import wap.web2.server.teambuild.entity.*;

class RecruitmentPolicyTest {
    private ProjectApply apply(long id, Position position) {
        User user = new User(); user.setId(id);
        return ProjectApply.builder().user(user).position(position).build();
    }
    private RecruitmentInfo roster(String position, Long... ids) {
        return new RecruitmentInfo(2, position, List.of(ids));
    }
    @Test void firstRoundCountsDistinctPeopleAcrossPositions() {
        List<ProjectApply> applies = List.of(apply(1, Position.AI), apply(1, Position.BACKEND),
            apply(2, Position.AI), apply(3, Position.BACKEND), apply(4, Position.BACKEND), apply(5, Position.AI));
        assertThatThrownBy(() -> RecruitmentPolicy.validate(List.of(roster("AI", 1L, 2L),
            roster("BACKEND", 1L)), applies, 1)).isInstanceOf(BadRequestException.class);
        assertThatCode(() -> RecruitmentPolicy.validate(List.of(roster("AI", 1L, 2L),
            roster("BACKEND", 1L, 3L)), applies, 1)).doesNotThrowAnyException();
    }
    @Test void fewerThanThreeRequiresEveryoneButNotEveryApplication() {
        List<ProjectApply> applies = List.of(apply(1, Position.AI), apply(1, Position.BACKEND), apply(2, Position.AI));
        assertThatThrownBy(() -> RecruitmentPolicy.validate(List.of(roster("AI", 1L)), applies, 1))
            .isInstanceOf(BadRequestException.class);
        assertThatCode(() -> RecruitmentPolicy.validate(List.of(roster("AI", 1L, 2L)), applies, 1))
            .doesNotThrowAnyException();
    }
    @Test void secondRoundAllowsNoneSomeOrAll() {
        List<ProjectApply> applies = List.of(apply(1, Position.AI), apply(2, Position.AI));
        for (List<RecruitmentInfo> rosters : List.of(List.<RecruitmentInfo>of(),
            List.of(roster("AI", 1L)), List.of(roster("AI", 1L, 2L)))) {
            assertThatCode(() -> RecruitmentPolicy.validate(rosters, applies, 2)).doesNotThrowAnyException();
        }
    }
    @Test void rejectsWrongPositionUnknownApplicantAndDuplicateIdsInBothRounds() {
        List<ProjectApply> applies = List.of(apply(1, Position.AI));
        for (int round : List.of(1, 2)) {
            for (RecruitmentInfo roster : List.of(roster("BACKEND", 1L), roster("AI", 2L), roster("AI", 1L, 1L))) {
                assertThatThrownBy(() -> RecruitmentPolicy.validate(List.of(roster), applies, round))
                    .isInstanceOf(BadRequestException.class);
            }
        }
    }
}
