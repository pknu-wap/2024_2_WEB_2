package wap.web2.server.teambuild.service;

import static wap.web2.server.util.SemesterGenerator.generateSemester;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import wap.web2.server.project.entity.Project;
import wap.web2.server.project.repository.ProjectRepository;
import wap.web2.server.teambuild.dto.TeamMemberResult;
import wap.web2.server.teambuild.dto.response.TeamBuildingResult;
import wap.web2.server.teambuild.dto.response.TeamBuildingResults;
import wap.web2.server.teambuild.entity.ProjectApply;
import wap.web2.server.teambuild.entity.Team;
import wap.web2.server.teambuild.repository.ProjectApplyRepository;
import wap.web2.server.teambuild.repository.TeamRepository;

@Service
@RequiredArgsConstructor
public class TeamBuildingResultService {

    private final wap.web2.server.member.repository.UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final ProjectRepository projectRepository;
    private final ProjectApplyRepository projectApplyRepository;

    @Transactional(readOnly = true)
    public TeamBuildingResults getResults() {
        final String semester = generateSemester();

        // 1) 이번 학기 모든 프로젝트
        List<Project> projects = projectRepository.findProjectsBySemester(semester);

        // 2) 이번 학기 팀 배정 결과(없을 수도 있음)
        List<Team> teams = teamRepository.findAllBySemester(semester);

        // 3) 프로젝트별 팀원 ID 묶기
        Map<Long, List<Long>> memberIdsByProject = teams
            .stream()
            .collect(
                Collectors.groupingBy(
                    Team::getProjectId,
                    Collectors.mapping(Team::getMemberId, Collectors.toList())
                )
            );

        // 4) 결과 조립 (팀원이 없으면 빈 배열)
        TeamBuildingResults results = new TeamBuildingResults();

        for (Project project : projects) {
            Long projectId = project.getProjectId();
            List<Long> memberIds = memberIdsByProject.getOrDefault(
                projectId,
                Collections.emptyList()
            );
            Map<Long, wap.web2.server.member.entity.User> users = userRepository.findAllById(memberIds).stream()
                .collect(Collectors.toMap(wap.web2.server.member.entity.User::getId, u -> u));
            List<TeamMemberResult> members = teams.stream()
                .filter(t -> t.getProjectId().equals(projectId))
                .map(t -> {
                    var user = users.get(t.getMemberId());
                    if (user == null) throw new wap.web2.server.exception.ResourceNotFoundException("배정된 사용자를 찾을 수 없습니다.");
                    return new TeamMemberResult(user.getId(), user.getName(), t.getPosition());
                }).toList();

            // 리더 정보
            TeamMemberResult leader = TeamMemberResult.fromLeader(project.getUser());

            // 카드 DTO 생성
            TeamBuildingResult result = TeamBuildingResult.of(project, leader, members);
            results.add(result);
        }

        return results;
    }

    @Transactional(readOnly = true)
    public List<TeamMemberResult> getUnassignedMembers(TeamBuildingResults results) {
        final String semester = generateSemester();

        // 1. 이미 배정된 유저 ID 수집
        Set<Long> allocatedUserIds = new HashSet<>();
        results
            .getResults()
            .forEach(result -> {
                if (result.getMembers() != null) {
                    result.getMembers().forEach(m -> allocatedUserIds.add(m.getId()));
                }
                // 팀장을 포함해서 배정자로 볼지 여부는 정책에 따라 결정
                if (result.getLeader() != null && result.getLeader().getId() != null) {
                    allocatedUserIds.add(result.getLeader().getId());
                }
            });

        // 2. 이번 학기 전체 지원 내역 조회
        List<ProjectApply> applies = projectApplyRepository.findAllBySemester(semester);

        // 3. 유저별 대표 지원(최저 priority)만 선택
        //  이번 학기 지원한 유저를 뽑아내기 위함!
        Map<Long, ProjectApply> bestApplyByUser = new HashMap<>();
        for (ProjectApply apply : applies) {
            Long userId = apply.getUser().getId();
            ProjectApply prev = bestApplyByUser.get(userId);
            if (prev == null || apply.getPriority() < prev.getPriority()) {
                bestApplyByUser.put(userId, apply);
            }
        }

        // 4. 배정 안된 사람만 필터링
        List<TeamMemberResult> unassigned = new ArrayList<>();
        for (ProjectApply apply : bestApplyByUser.values()) {
            if (!allocatedUserIds.contains(apply.getUser().getId())) {
                unassigned.add(
                    TeamMemberResult.builder()
                        .id(apply.getUser().getId())
                        .name(apply.getUser().getName())
                        .position(apply.getPosition())
                        .build()
                );
            }
        }

        return unassigned;
    }
}
