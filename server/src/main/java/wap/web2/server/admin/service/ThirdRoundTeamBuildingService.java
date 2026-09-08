package wap.web2.server.admin.service;

import static wap.web2.server.util.SemesterGenerator.generateSemester;
import java.util.*;
import java.util.random.RandomGenerator;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import wap.web2.server.admin.entity.*;
import wap.web2.server.admin.repository.TeamBuildingMetaRepository;
import wap.web2.server.exception.*;
import wap.web2.server.project.entity.Project;
import wap.web2.server.project.repository.ProjectRepository;
import wap.web2.server.teambuild.entity.*;
import wap.web2.server.teambuild.repository.*;
import wap.web2.server.teambuild.service.*;
import wap.web2.server.teambuild.service.PositionTeamBuilder.Slot;

/** Server-side administration; no new frontend endpoints are exposed. */
@Service
@RequiredArgsConstructor
public class ThirdRoundTeamBuildingService {
    private final TeamBuildingMetaRepository metaRepository;
    private final FieldClusterMemberRepository clusterRepository;
    private final ProjectApplyRepository applyRepository;
    private final ProjectRecruitRepository recruitRepository;
    private final TeamRepository teamRepository;
    private final ProjectRepository projectRepository;
    private final FieldClusterer clusterer;
    private final RandomFieldTeamBuilder builder;

    @Transactional(readOnly = true)
    public List<FieldClusterMember> getClusters() {
        return clusterRepository.findAllBySemesterOrderByUserId(generateSemester());
    }

    @Transactional
    public List<FieldClusterMember> rebuildClusters() {
        lockReadyMeta();
        String semester = generateSemester();
        Map<Long, Position> clusters = currentCandidates();
        clusterRepository.deleteBySemester(semester);
        return clusterRepository.saveAll(clusters.entrySet().stream()
            .map(e -> new FieldClusterMember(semester, e.getKey(), e.getValue())).toList());
    }

    @Transactional
    public void updateClusters(Map<Long, Position> changes) {
        lockReadyMeta();
        if (changes == null) throw new BadRequestException("수정할 클러스터가 필요합니다.");
        Map<Long, FieldClusterMember> members = getClusters().stream()
            .collect(Collectors.toMap(FieldClusterMember::getUserId, m -> m));
        Set<Long> eligible = currentCandidates().keySet();
        changes.forEach((id, position) -> {
            if (!eligible.contains(id) || !members.containsKey(id) || position == null) {
                throw new BadRequestException("미배정 클러스터 멤버와 유효한 분야를 지정해야 합니다.");
            }
        });
        changes.forEach((id, position) -> members.get(id).changePosition(position));
    }

    @Transactional
    public void allocate() {
        TeamBuildingMeta meta = lockReadyMeta();
        String semester = generateSemester();
        Map<Long, Position> clusters = getClusters().stream()
            .collect(Collectors.toMap(FieldClusterMember::getUserId, FieldClusterMember::getPosition));
        if (!clusters.keySet().equals(currentCandidates().keySet())) {
            throw new ConflictException("현재 미배정 인원으로 클러스터를 생성한 후 배정해야 합니다.");
        }
        Map<Long, Long> leaders = projectRepository.findProjectsBySemester(semester).stream()
            .filter(p -> !p.isRecruitmentClosed())
            .collect(Collectors.toMap(Project::getProjectId, p -> p.getUser().getId()));
        Map<Slot, ProjectRecruit> latest = new HashMap<>();
        for (int round : List.of(1, 2)) {
            for (ProjectRecruit recruit : recruitRepository.findAllBySemesterAndRound(semester, round)) {
                if (leaders.containsKey(recruit.getProjectId()))
                    latest.put(new Slot(recruit.getProjectId(), recruit.getPosition()), recruit);
            }
        }
        List<Team> existing = teamRepository.findAllBySemester(semester);
        Map<Slot, Integer> vacancies = new HashMap<>();
        latest.forEach((slot, recruit) -> {
            long filled = existing.stream().filter(t -> t.getProjectId().equals(slot.projectId())
                && t.getPosition() == slot.position() && t.getRound() >= recruit.getRound()).count();
            vacancies.put(slot, Math.max(0, recruit.getCapacity() - (int) filled));
        });
        var allocation = builder.allocate(clusters, vacancies, RandomGenerator.getDefault());
        List<Team> teams = new ArrayList<>();
        allocation.forEach((slot, ids) -> ids.forEach(id -> teams.add(Team.builder()
            .projectId(slot.projectId()).position(slot.position()).memberId(id)
            .leaderId(leaders.get(slot.projectId())).semester(semester).round(3).build())));
        teamRepository.saveAll(teams);
        meta.completeThirdRound();
    }

    private Map<Long, Position> currentCandidates() {
        String semester = generateSemester();
        Set<Long> excluded = new HashSet<>();
        teamRepository.findAllBySemester(semester).forEach(t -> excluded.add(t.getMemberId()));
        projectRepository.findProjectsBySemester(semester).forEach(p -> excluded.add(p.getUser().getId()));
        return clusterer.cluster(applyRepository.findAllBySemester(semester), excluded);
    }

    private TeamBuildingMeta lockReadyMeta() {
        TeamBuildingMeta meta = metaRepository.findBySemesterForUpdate(generateSemester())
            .orElseThrow(() -> new ConflictException("팀빌딩이 초기화되지 않았습니다."));
        if (meta.getStatus() != TeamBuildingStatus.CLOSED || meta.getCompletedRound() != 2) {
            throw new ConflictException("2차 배정 완료 후에만 3차 팀빌딩을 진행할 수 있습니다.");
        }
        return meta;
    }
}
