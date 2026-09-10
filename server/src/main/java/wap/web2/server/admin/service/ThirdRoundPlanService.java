package wap.web2.server.admin.service;

import static wap.web2.server.util.SemesterGenerator.generateSemester;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import wap.web2.server.admin.dto.response.ThirdRoundBoardResponse;
import wap.web2.server.admin.dto.response.ThirdRoundBoardResponse.*;
import wap.web2.server.admin.entity.*;
import wap.web2.server.admin.repository.*;
import wap.web2.server.exception.*;
import wap.web2.server.member.entity.User;
import wap.web2.server.member.repository.UserRepository;
import wap.web2.server.project.entity.Project;
import wap.web2.server.project.repository.ProjectRepository;
import wap.web2.server.teambuild.entity.*;
import wap.web2.server.teambuild.repository.*;
import wap.web2.server.teambuild.service.FieldClusterer;

/** A persisted applicant staffing plan, separate from finalized team allocation. */
@Service
@RequiredArgsConstructor
@Transactional
public class ThirdRoundPlanService {
    private final TeamBuildingMetaRepository metas;
    private final ThirdRoundPlanRepository plans;
    private final ThirdRoundPlanTeamRepository planTeams;
    private final ThirdRoundPositionSlotRepository slots;
    private final ProjectRepository projects;
    private final TeamRepository teams;
    private final ProjectApplyRepository applies;
    private final FieldClusterMemberRepository clusters;
    private final UserRepository users;
    private final FieldClusterer clusterer;

    /** Idempotent initialization, serialized with allocation and every plan mutation. */
    public ThirdRoundBoardResponse open() {
        String semester = generateSemester();
        TeamBuildingMeta meta = lockMeta(semester);
        ThirdRoundPlan plan = plans.findById(semester).orElse(null);
        if (plan != null && plan.isCompleted() && meta.getCompletedRound() == 3) return board(plan);
        requireReady(meta);
        if (plan == null) {
            plan = plans.save(new ThirdRoundPlan(semester));
            List<Project> currentProjects = projects.findProjectsBySemester(semester);
            planTeams.saveAll(currentProjects.stream()
                .sorted(Comparator.comparing(Project::getProjectId))
                .map(p -> new ThirdRoundPlanTeam(semester, p.getProjectId(), p.getTitle())).toList());
            Set<Long> excluded = teams.findAllBySemester(semester).stream()
                .map(Team::getMemberId).collect(Collectors.toSet());
            currentProjects.forEach(p -> excluded.add(p.getUser().getId()));
            Map<Long, Position> candidates = clusterer.cluster(applies.findAllBySemester(semester), excluded);
            // Preserve an administrator's field corrections for eligible applicants.
            clusters.findAllBySemesterOrderByUserId(semester).forEach(c -> {
                if (candidates.containsKey(c.getUserId())) candidates.put(c.getUserId(), c.getPosition());
            });
            slots.saveAll(candidates.entrySet().stream().sorted(Map.Entry.comparingByKey())
                .map(entry -> {
                    ThirdRoundPositionSlot slot = new ThirdRoundPositionSlot(semester, entry.getValue());
                    slot.identify(entry.getKey());
                    return slot;
                }).toList());
        }
        return board(plan);
    }

    public ThirdRoundBoardResponse get() {
        String semester = generateSemester();
        TeamBuildingMeta meta = lockMeta(semester);
        ThirdRoundPlan plan = requirePlan(semester);
        if (!plan.isCompleted() || meta.getCompletedRound() != 3) requireReady(meta);
        return board(plan);
    }

    public ThirdRoundBoardResponse create(long revision) {
        ThirdRoundPlan plan = editable(revision);
        planTeams.save(new ThirdRoundPlanTeam(plan.getSemester(), null, plan.nextTeamName()));
        plan.advanceRevision();
        return board(plan);
    }

    public ThirdRoundBoardResponse move(long slotId, Long teamId, long revision) {
        ThirdRoundPlan plan = editable(revision);
        ThirdRoundPositionSlot slot = slots.findById(slotId)
            .filter(s -> s.getSemester().equals(plan.getSemester()))
            .orElseThrow(() -> new ResourceNotFoundException("직무 인원을 찾을 수 없습니다."));
        if (teamId != null) requireTeam(teamId, plan.getSemester());
        if (!Objects.equals(slot.getTeamId(), teamId)) {
            slot.moveTo(teamId);
            plan.advanceRevision();
        }
        return board(plan);
    }

    public ThirdRoundBoardResponse complete(long revision) {
        ThirdRoundPlan plan = editable(revision);
        String semester = plan.getSemester();
        List<ThirdRoundPositionSlot> positions = new ArrayList<>(slots.findAllBySemesterOrderById(semester));
        List<Team> existing = teams.findAllBySemester(semester);
        identifyLegacySlots(semester, positions, existing);
        Map<Long, Project> currentProjects = projects.findProjectsBySemester(semester).stream()
            .collect(Collectors.toMap(Project::getProjectId, p -> p));
        Map<Long, ThirdRoundPlanTeam> cards = planTeams.findAllBySemesterOrderById(semester).stream()
            .collect(Collectors.toMap(ThirdRoundPlanTeam::getId, c -> c));
        includeExistingMembers(semester, positions, existing, new ArrayList<>(cards.values()));
        Set<Long> represented = positions.stream().map(ThirdRoundPositionSlot::getUserId)
            .filter(Objects::nonNull).collect(Collectors.toSet());
        Set<Long> allocated = existing.stream().map(Team::getMemberId)
            .filter(id -> !represented.contains(id)).collect(Collectors.toSet());
        Set<Team> retained = new HashSet<>();
        currentProjects.values().forEach(p -> allocated.add(p.getUser().getId()));
        List<ThirdRoundPositionSlot> assigned = positions.stream().filter(s -> s.getTeamId() != null).toList();
        Set<Long> validUsers = users.findAllById(assigned.stream().map(ThirdRoundPositionSlot::getUserId)
            .filter(Objects::nonNull).toList()).stream().map(User::getId).collect(Collectors.toSet());
        List<Team> allocation = new ArrayList<>();
        for (ThirdRoundPositionSlot slot : assigned) {
            if (slot.getUserId() == null || !validUsers.contains(slot.getUserId()))
                throw new ConflictException("배치한 지원자의 정보를 확인해 주세요.");
            if (!allocated.add(slot.getUserId()))
                throw new ConflictException("이미 배정되었거나 중복된 지원자가 있습니다.");
            ThirdRoundPlanTeam card = cards.get(slot.getTeamId());
            if (card == null) throw new ConflictException("배치할 팀을 찾을 수 없습니다.");
            if (card.getProjectId() != null) {
                Project project = currentProjects.get(card.getProjectId());
                if (project == null) throw new ConflictException("기존 프로젝트를 찾을 수 없습니다.");
                Team unchanged = existing.stream().filter(t -> t.getMemberId().equals(slot.getUserId())
                    && t.getProjectId().equals(project.getProjectId()) && t.getPosition() == slot.getPosition())
                    .findFirst().orElse(null);
                if (unchanged != null) {
                    retained.add(unchanged);
                    continue;
                }
                allocation.add(Team.builder().projectId(project.getProjectId())
                    .leaderId(project.getUser().getId()).memberId(slot.getUserId())
                    .position(slot.getPosition()).round(3).semester(semester).build());
            }
        }
        teams.deleteAll(existing.stream().filter(t -> represented.contains(t.getMemberId())
            && !retained.contains(t)).toList());
        teams.flush();
        teams.saveAll(allocation);
        plan.complete();
        lockMeta(semester).completeThirdRound();
        return board(plan);
    }

    public ThirdRoundBoardResponse shuffle(long revision) {
        return shuffle(revision, new Random());
    }

    ThirdRoundBoardResponse shuffle(long revision, Random random) {
        ThirdRoundPlan plan = editable(revision);
        List<ThirdRoundPositionSlot> positions = new ArrayList<>(slots.findAllBySemesterOrderById(plan.getSemester()));
        includeExistingMembers(plan.getSemester(), positions, teams.findAllBySemester(plan.getSemester()),
            planTeams.findAllBySemesterOrderById(plan.getSemester()));
        identifyLegacySlots(plan.getSemester(), positions, teams.findAllBySemester(plan.getSemester()));
        Map<Position, List<ThirdRoundPositionSlot>> groups = positions.stream()
            .filter(slot -> slot.getUserId() != null)
            .collect(Collectors.groupingBy(ThirdRoundPositionSlot::getPosition));
        for (List<ThirdRoundPositionSlot> group : groups.values()) {
            // Null destinations are unassigned places and participate in the same permutation.
            List<Long> destinations = group.stream().map(ThirdRoundPositionSlot::getTeamId)
                .collect(Collectors.toCollection(ArrayList::new));
            Collections.shuffle(destinations, random);
            for (int i = 0; i < group.size(); i++) group.get(i).moveTo(destinations.get(i));
        }
        plan.advanceRevision();
        return board(plan);
    }

    public ThirdRoundBoardResponse delete(long teamId, long revision) {
        ThirdRoundPlan plan = editable(revision);
        ThirdRoundPlanTeam team = requireTeam(teamId, plan.getSemester());
        if (!team.isCreated()) throw new BadRequestException("3차 팀빌딩에서 생성한 팀만 삭제할 수 있습니다.");
        slots.findAllBySemesterOrderById(plan.getSemester()).stream()
            .filter(s -> Objects.equals(s.getTeamId(), teamId)).forEach(s -> s.moveTo(null));
        slots.flush(); // Release FK references before deleting the team.
        planTeams.delete(team);
        plan.advanceRevision();
        return board(plan);
    }

    private ThirdRoundPlan editable(long revision) {
        String semester = generateSemester();
        lockReady(semester);
        ThirdRoundPlan plan = requirePlan(semester);
        if (plan.isCompleted()) throw new ConflictException("완료된 팀빌딩은 수정할 수 없습니다.");
        if (plan.getRevision() != revision) {
            throw new ConflictException("다른 관리자가 배치안을 변경했습니다. 새로고침 후 다시 시도해 주세요.");
        }
        return plan;
    }

    private void lockReady(String semester) {
        requireReady(lockMeta(semester));
    }

    private TeamBuildingMeta lockMeta(String semester) {
        return metas.findBySemesterForUpdate(semester)
            .orElseThrow(() -> new ConflictException("팀빌딩이 초기화되지 않았습니다."));
    }

    private void requireReady(TeamBuildingMeta meta) {
        if (meta.getStatus() != TeamBuildingStatus.CLOSED || meta.getCompletedRound() != 2) {
            throw new ConflictException("2차 배정 완료 후에만 3차 배치안을 사용할 수 있습니다.");
        }
    }

    private ThirdRoundPlan requirePlan(String semester) {
        return plans.findById(semester)
            .orElseThrow(() -> new ConflictException("3차 배치안을 먼저 열어 주세요."));
    }

    private ThirdRoundPlanTeam requireTeam(long id, String semester) {
        return planTeams.findById(id).filter(t -> t.getSemester().equals(semester))
            .orElseThrow(() -> new ResourceNotFoundException("팀을 찾을 수 없습니다."));
    }

    private ThirdRoundBoardResponse board(ThirdRoundPlan plan) {
        String semester = plan.getSemester();
        List<ThirdRoundPlanTeam> cards = planTeams.findAllBySemesterOrderById(semester);
        List<ThirdRoundPositionSlot> positions = new ArrayList<>(slots.findAllBySemesterOrderById(semester));
        List<Team> existing = teams.findAllBySemester(semester);
        if (!plan.isCompleted()) {
            identifyLegacySlots(semester, positions, existing);
            includeExistingMembers(semester, positions, existing, cards);
        }
        Set<Long> represented = positions.stream().map(ThirdRoundPositionSlot::getUserId)
            .filter(Objects::nonNull).collect(Collectors.toSet());
        Set<Long> userIds = existing.stream().map(Team::getMemberId).collect(Collectors.toSet());
        positions.stream().map(ThirdRoundPositionSlot::getUserId).filter(Objects::nonNull).forEach(userIds::add);
        Map<Long, User> members = users.findAllById(new ArrayList<>(userIds))
            .stream().collect(Collectors.toMap(User::getId, u -> u));
        Map<Long, Project> currentProjects = projects.findProjectsBySemester(semester).stream()
            .collect(Collectors.toMap(Project::getProjectId, p -> p));
        List<TeamCard> result = new ArrayList<>();
        for (ThirdRoundPlanTeam card : cards) {
            List<Member> roster = new ArrayList<>();
            if (card.getProjectId() != null) {
                existing.stream().filter(t -> t.getProjectId().equals(card.getProjectId()))
                    .filter(t -> !represented.contains(t.getMemberId())).forEach(t -> {
                    User user = members.get(t.getMemberId());
                    if (user == null) throw new ResourceNotFoundException("배정된 사용자를 찾을 수 없습니다.");
                    roster.add(new Member("member-" + user.getId(), "MEMBER", user.getName(), t.getPosition()));
                });
            }
            positions.stream().filter(s -> Objects.equals(s.getTeamId(), card.getId()))
                .map(s -> slotView(s, members)).forEach(roster::add);
            Project project = currentProjects.get(card.getProjectId());
            User owner = project == null ? null : project.getUser();
            Leader leader = owner == null ? null : new Leader(owner.getId(), owner.getName());
            result.add(new TeamCard(card.getId(), card.getProjectId(), card.getName(), card.isCreated(), roster, leader,
                project == null ? null : project.getProjectType()));
        }
        return new ThirdRoundBoardResponse(semester, plan.getRevision(), result,
            positions.stream().filter(s -> s.getTeamId() == null).map(s -> slotView(s, members)).toList(), plan.isCompleted());
    }

    /** Upgrade existing drafts without resetting any saved moves or unassignments. */
    private void includeExistingMembers(String semester, List<ThirdRoundPositionSlot> positions,
                                        List<Team> existing, List<ThirdRoundPlanTeam> cards) {
        Set<Long> represented = positions.stream().map(ThirdRoundPositionSlot::getUserId)
            .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, Long> cardIds = cards.stream().filter(c -> c.getProjectId() != null)
            .collect(Collectors.toMap(ThirdRoundPlanTeam::getProjectId, ThirdRoundPlanTeam::getId));
        for (Team member : existing) {
            Long cardId = cardIds.get(member.getProjectId());
            if (cardId == null || !represented.add(member.getMemberId())) continue;
            ThirdRoundPositionSlot slot = new ThirdRoundPositionSlot(semester, member.getPosition());
            slot.identify(member.getMemberId());
            slot.moveTo(cardId);
            positions.add(slots.save(slot));
        }
    }

    private void identifyLegacySlots(String semester, List<ThirdRoundPositionSlot> positions, List<Team> existing) {
        if (positions.stream().noneMatch(s -> s.getUserId() == null)) return;
        Set<Long> excluded = existing.stream().map(Team::getMemberId).collect(Collectors.toSet());
        projects.findProjectsBySemester(semester).forEach(p -> excluded.add(p.getUser().getId()));
        Map<Long, Position> candidates = clusterer.cluster(applies.findAllBySemester(semester), excluded);
        clusters.findAllBySemesterOrderByUserId(semester).forEach(c -> {
            if (candidates.containsKey(c.getUserId())) candidates.put(c.getUserId(), c.getPosition());
        });
        positions.forEach(s -> candidates.remove(s.getUserId()));
        for (ThirdRoundPositionSlot slot : positions) {
            if (slot.getUserId() != null) continue;
            candidates.entrySet().stream().filter(e -> e.getValue() == slot.getPosition())
                .map(Map.Entry::getKey).min(Long::compareTo).ifPresent(id -> {
                    slot.identify(id);
                    candidates.remove(id);
                });
        }
    }

    private Member slotView(ThirdRoundPositionSlot slot, Map<Long, User> members) {
        User user = members.get(slot.getUserId());
        return new Member("slot-" + slot.getId(), "POSITION_SLOT",
            user == null ? null : user.getName(), slot.getPosition());
    }
}
