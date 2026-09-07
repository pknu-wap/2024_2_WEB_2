package wap.web2.server.admin.service;

import static wap.web2.server.util.SemesterGenerator.generateSemester;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import wap.web2.server.admin.dto.request.TeamBuildingStatusRequest;
import wap.web2.server.admin.entity.*;
import wap.web2.server.admin.repository.TeamBuildingMetaRepository;
import wap.web2.server.exception.*;
import wap.web2.server.project.entity.Project;
import wap.web2.server.project.repository.ProjectRepository;
import wap.web2.server.teambuild.entity.*;
import wap.web2.server.teambuild.repository.*;
import wap.web2.server.teambuild.service.PositionTeamBuilder;

@Service
@RequiredArgsConstructor
public class AdminTeamBuildingService {
    private final TeamBuildingMetaRepository teamBuildingMetaRepository;
    private final ProjectRecruitRepository recruitRepository;
    private final ProjectApplyRepository applyRepository;
    private final ProjectRepository projectRepository;
    private final TeamRepository teamRepository;
    private final FieldClusterMemberRepository clusterRepository;
    private final PositionTeamBuilder teamBuilder;

    @Transactional(readOnly = true)
    public TeamBuildingStatus getStatus() {
        return teamBuildingMetaRepository.findBySemester(generateSemester())
            .orElseThrow(() -> new ConflictException("현재 학기의 팀빌딩이 초기화되지 않았습니다.")).getStatus();
    }

    @Transactional(readOnly = true)
    public TeamBuildingMeta getMeta() {
        return teamBuildingMetaRepository.findBySemester(generateSemester())
            .orElseThrow(() -> new ConflictException("현재 학기의 팀빌딩이 초기화되지 않았습니다."));
    }

    @Transactional
    public void changeStatus(TeamBuildingStatusRequest request) {
        if (request.status() == null) throw new BadRequestException("팀빌딩 상태가 필요합니다.");
        TeamBuildingMeta meta = teamBuildingMetaRepository.findBySemesterForUpdate(request.semester())
            .orElseThrow(() -> new ResourceNotFoundException("해당 학기의 팀빌딩을 찾을 수 없습니다."));
        meta.changeStatus(request.status());
    }

    @Transactional
    public void openTeamBuilding(String semester) {
        if (teamBuildingMetaRepository.existsTeamBuildingMetaBySemester(semester)) {
            throw new ConflictException("해당 학기의 팀빌딩이 이미 생성되었습니다.");
        }
        teamBuildingMetaRepository.save(new TeamBuildingMeta(semester));
    }

    @Transactional
    public void resetTeamBuilding() {
        String semester = generateSemester();
        TeamBuildingMeta meta = teamBuildingMetaRepository.findBySemesterForUpdate(semester)
            .orElseThrow(() -> new ConflictException("현재 학기의 팀빌딩이 생성되지 않았습니다."));
        teamRepository.deleteBySemester(semester);
        clusterRepository.deleteBySemester(semester);
        meta.reset();
    }

    @Transactional
    public void makeTeam() {
        String semester = generateSemester();
        TeamBuildingMeta meta = teamBuildingMetaRepository.findBySemesterForUpdate(semester)
            .orElseThrow(() -> new ConflictException("현재 학기의 팀빌딩이 초기화되지 않았습니다."));
        if (meta.getStatus() != TeamBuildingStatus.CLOSED || meta.getCompletedRound() >= meta.getRound()) {
            throw new ConflictException("모집을 마친 미배정 차수에서만 팀을 구성할 수 있습니다.");
        }
        List<Project> projects = projectRepository.findProjectsBySemester(semester);
        Map<Long, Long> leaders = new HashMap<>();
        Set<Long> excluded = new HashSet<>();
        projects.forEach(p -> { leaders.put(p.getProjectId(), p.getUser().getId()); excluded.add(p.getUser().getId()); });
        teamRepository.findAllBySemester(semester).forEach(t -> excluded.add(t.getMemberId()));
        var applies = applyRepository.findAllBySemesterAndRound(semester, meta.getRound());
        var recruits = recruitRepository.findAllBySemesterAndRound(semester, meta.getRound()).stream()
            .filter(r -> leaders.containsKey(r.getProjectId())).toList();
        var allocation = teamBuilder.allocate(applies, recruits, excluded);
        List<Team> teams = new ArrayList<>();
        allocation.forEach((slot, ids) -> ids.forEach(id -> teams.add(Team.builder()
            .projectId(slot.projectId()).position(slot.position()).leaderId(leaders.get(slot.projectId()))
            .memberId(id).semester(semester).round(meta.getRound()).build())));
        teamRepository.saveAll(teams);
        meta.completeRound();
    }
}
