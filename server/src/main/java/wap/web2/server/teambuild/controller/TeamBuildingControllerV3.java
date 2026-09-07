package wap.web2.server.teambuild.controller;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import wap.web2.server.global.security.CurrentUser;
import wap.web2.server.global.security.UserPrincipal;
import wap.web2.server.project.service.ProjectService;
import wap.web2.server.teambuild.dto.RecruitmentDto;
import wap.web2.server.teambuild.dto.TeamMemberResult;
import wap.web2.server.teambuild.dto.request.ProjectAppliesRequest;
import wap.web2.server.teambuild.dto.response.ApplyStatusResponse;
import wap.web2.server.teambuild.dto.response.ProjectAppliesResponse;
import wap.web2.server.teambuild.dto.response.ProjectTemplate;
import wap.web2.server.teambuild.dto.response.RoleResponse;
import wap.web2.server.teambuild.dto.response.RecruitProjectResponse;
import wap.web2.server.teambuild.dto.response.TeamBuildingResults;
import wap.web2.server.teambuild.dto.response.TeamResultsResponse;
import wap.web2.server.teambuild.service.ApplyService;
import wap.web2.server.teambuild.service.TeamBuildingResultService;

@RestController
@RequestMapping("/team-build")
@RequiredArgsConstructor
public class TeamBuildingControllerV3 {

    private final TeamBuildingResultService teamBuildingResultService;
    private final ProjectService projectService;
    private final ApplyService applyService;

    @GetMapping("/role")
    public ResponseEntity<RoleResponse> getMyRole(@CurrentUser UserPrincipal userPrincipal) {
        boolean isLeader = projectService.isLeader(userPrincipal.getId());
        return ResponseEntity.ok(new RoleResponse(isLeader ? "leader" : "member"));
    }

    @GetMapping("/apply/status")
    public ResponseEntity<ApplyStatusResponse> getApplyStatus(
        @CurrentUser UserPrincipal userPrincipal
    ) {
        boolean hasApplied = applyService.hasAppliedThisSemester(userPrincipal.getId());
        return ResponseEntity.ok(new ApplyStatusResponse(hasApplied));
    }

    @GetMapping("/projects")
    public ResponseEntity<List<ProjectTemplate>> getCurrentProjects(
        @CurrentUser UserPrincipal userPrincipal
    ) {
        List<ProjectTemplate> projects = projectService.getCurrentProjectRecruits();
        return ResponseEntity.ok(projects);
    }

    @GetMapping("/recruit/projects")
    public ResponseEntity<List<RecruitProjectResponse>> getMyRecruitProjects(
        @CurrentUser UserPrincipal userPrincipal
    ) {
        return ResponseEntity.ok(projectService.getMyRecruitProjects(userPrincipal.getId()));
    }

    @PostMapping("/apply/submit")
    public ResponseEntity<String> apply(
        @CurrentUser UserPrincipal userPrincipal,
        @RequestParam(name = "round", defaultValue = "1") int round,
        @Valid @RequestBody ProjectAppliesRequest request
    ) {
        applyService.apply(userPrincipal, request, round);
        return ResponseEntity.ok("지원이 완료되었습니다.");
    }

    @PostMapping("/recruit/submit")
    public ResponseEntity<String> setPreference(
        @CurrentUser UserPrincipal userPrincipal,
        @RequestParam(name = "round", defaultValue = "1") int round,
        @Valid @RequestBody RecruitmentDto request
    ) {
        applyService.setPreference(userPrincipal, request, round);
        return ResponseEntity.ok("모집 정보가 등록되었습니다.");
    }

    @GetMapping("/{projectId}/applies")
    public ResponseEntity<ProjectAppliesResponse> getRecruitPageData(
        @CurrentUser UserPrincipal userPrincipal,
        @RequestParam(name = "round", defaultValue = "1") int round,
        @PathVariable("projectId") Long projectId
    ) {
        ProjectAppliesResponse response = applyService.getRecruitPageData(userPrincipal, projectId, round);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/results")
    public ResponseEntity<TeamResultsResponse> getTeamBuildResults() {
        TeamBuildingResults results = teamBuildingResultService.getResults();
        List<TeamMemberResult> unassigned = teamBuildingResultService.getUnassignedMembers(results);

        TeamResultsResponse response = new TeamResultsResponse(results.getResults(), unassigned);
        return ResponseEntity.ok(response);
    }
}
