package wap.web2.server.admin.controller;

import static wap.web2.server.util.SemesterGenerator.generateSemester;

import io.swagger.v3.oas.annotations.Operation;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import wap.web2.server.admin.dto.request.TeamBuildingStatusRequest;
import wap.web2.server.admin.dto.response.TeamBuildingMetaStatusResponse;
import wap.web2.server.admin.service.AdminTeamBuildingService;
import wap.web2.server.admin.service.TeamBuildingExportService;

@RestController
@RequestMapping("/admin/team")
@RequiredArgsConstructor
public class AdminTeamBuildingController {

    private final TeamBuildingExportService exportService;
    private final AdminTeamBuildingService adminTeamBuildingService;

    @PostMapping("/building/run")
    @Operation(summary = "팀 생성", description = "지원과 모집이 완료되면 팀을 생성합니다.")
    public ResponseEntity<String> makeTeam() {
        adminTeamBuildingService.makeTeam();
        return ResponseEntity.ok("팀 분배가 완료되었습니다.");
    }

    @GetMapping("/building/status")
    @Operation(summary = "팀빌딩 상태 조회", description = "현재 팀빌딩 기능의 상태를 조회합니다.")
    public ResponseEntity<TeamBuildingMetaStatusResponse> getStatus() {
        return ResponseEntity.ok(TeamBuildingMetaStatusResponse.of(adminTeamBuildingService.getMeta()));
    }

    // TODO: status request를 직렬화했을 때 예외가 발생한다면?
    @PatchMapping("/building/status")
    @Operation(summary = "팀빌딩 상태 변경", description = "팀빌딩 상태를 변경합니다.")
    public ResponseEntity<Void> changeStatus(@RequestBody TeamBuildingStatusRequest statusRequest) {
        adminTeamBuildingService.changeStatus(statusRequest);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/building/open/current")
    @Operation(
        summary = "현재 학기 팀빌딩 생성",
        description = "현재 학기의 팀빌딩 기능을 생성합니다."
    )
    public ResponseEntity<Void> openTeamBuilding() {
        adminTeamBuildingService.openTeamBuilding(generateSemester());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/building/reset/current")
    @Operation(summary = "현재 학기 팀빌딩 초기화",
        description = "지원·모집 데이터는 유지하고 배정 결과와 3차 분류 정보를 삭제한 뒤 시작 단계로 되돌립니다.")
    public ResponseEntity<Void> resetTeamBuilding() {
        adminTeamBuildingService.resetTeamBuilding();
        return ResponseEntity.ok().build();
    }

    @GetMapping(value = "/applies/export", produces = "text/csv; charset=UTF-8")
    @Operation(
        summary = "지원 현황 CSV 다운로드",
        description = "현재까지의 지원 현황을 CSV 형식으로 다운로드합니다."
    )
    public ResponseEntity<byte[]> exportAppliesCsv() {
        byte[] bytes = exportService.generateAppliesCsvBytes();

        String filename = "applies_" + LocalDate.now() + ".csv";
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
            .contentLength(bytes.length)
            .body(bytes);
    }

    @GetMapping(value = "/recruits/export", produces = "text/csv; charset=UTF-8")
    @Operation(
        summary = "모집 현황 CSV 다운로드",
        description = "현재까지의 모집 현황을 CSV 형식으로 다운로드합니다."
    )
    public ResponseEntity<byte[]> exportRecruitsCsv() {
        byte[] bytes = exportService.generateRecruitsCsvBytes();

        String filename = "recruits_" + LocalDate.now() + ".csv";
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
            .contentLength(bytes.length)
            .body(bytes);
    }
}
