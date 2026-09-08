package wap.web2.server.teambuild.service;

import java.util.*;
import wap.web2.server.exception.BadRequestException;
import wap.web2.server.teambuild.dto.RecruitmentDto.RecruitmentInfo;
import wap.web2.server.teambuild.entity.Position;
import wap.web2.server.teambuild.entity.ProjectApply;

/** Counts people across all positions; multiple applications by one person count once. */
public final class RecruitmentPolicy {
    private static final int FIRST_ROUND_MIN_SELECTED_APPLICANTS = 3;

    private RecruitmentPolicy() {}

    public static void validate(List<RecruitmentInfo> rosters, List<ProjectApply> applies, int round) {
        if (round != 1 && round != 2) {
            throw new BadRequestException("지원 및 모집 차수는 1 또는 2여야 합니다.");
        }
        if (rosters == null) {
            throw new BadRequestException("모집 목록이 필요합니다.");
        }
        Map<Position, Set<Long>> eligible = new EnumMap<>(Position.class);
        Set<Long> applicants = new HashSet<>();
        for (ProjectApply apply : applies) {
            Long id = apply.getUser().getId();
            applicants.add(id);
            eligible.computeIfAbsent(apply.getPosition(), key -> new HashSet<>()).add(id);
        }
        Set<Position> positions = EnumSet.noneOf(Position.class);
        Set<Long> selected = new HashSet<>();
        for (RecruitmentInfo roster : rosters) {
            if (roster == null || roster.getCapacity() == null || roster.getCapacity() < 0 ||
                roster.getApplicantIds() == null) {
                throw new BadRequestException("모집 정원은 0 이상이며 지원자 목록이 필요합니다.");
            }
            Position position;
            try {
                position = Position.valueOf(roster.getPosition().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException | NullPointerException e) {
                throw new BadRequestException("유효하지 않은 포지션입니다.");
            }
            if (!positions.add(position)) {
                throw new BadRequestException("직무별 모집 정보는 한 번만 제출할 수 있습니다.");
            }
            Set<Long> inPosition = new HashSet<>();
            for (Long id : roster.getApplicantIds()) {
                if (id == null || !inPosition.add(id) ||
                    !eligible.getOrDefault(position, Set.of()).contains(id)) {
                    throw new BadRequestException("해당 차수와 직무의 지원자를 중복 없이 선택해야 합니다.");
                }
                selected.add(id);
            }
        }
        if (round == 1 && selected.size() < Math.min(FIRST_ROUND_MIN_SELECTED_APPLICANTS, applicants.size())) {
            throw new BadRequestException(String.format(
                "1차 모집은 지원자 %d명 이상을 선택해야 하며, %d명 미만이면 모두 선택해야 합니다.",
                FIRST_ROUND_MIN_SELECTED_APPLICANTS, FIRST_ROUND_MIN_SELECTED_APPLICANTS));
        }
    }
}
