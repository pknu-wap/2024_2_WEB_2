package wap.web2.server.project.controller;

import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Encoding;
import java.io.IOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import wap.web2.server.exception.BadRequestException;
import wap.web2.server.global.security.CurrentUser;
import wap.web2.server.global.security.UserPrincipal;
import wap.web2.server.project.dto.request.ProjectRequest;
import wap.web2.server.project.dto.response.ProjectCurrentSemesterResponse;
import wap.web2.server.project.dto.response.ProjectDetailsResponse;
import wap.web2.server.project.dto.response.ProjectInfoResponse;
import wap.web2.server.project.dto.response.ProjectsResponse;
import wap.web2.server.project.service.ProjectService;
import wap.web2.server.util.Semester;

@RestController
@RequestMapping("/project")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    // TODO: ProjectsResponse를 만들기 전에 검사하거나 별도로 할까?
    //  또는 컨트롤러에서는 try catch를 두고 ProjectResponse안에서 throw 하는 것은?
    @GetMapping("/list")
    public ResponseEntity<ProjectsResponse> getProjects(
        @RequestParam("semester") @Semester String semester
    ) {
        List<ProjectInfoResponse> projects = projectService.getProjects(semester);
        ProjectsResponse projectsResponse = ProjectsResponse.builder()
            .projectsResponse(projects)
            .build();

        if (projectsResponse.getProjectsResponse().isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(projectsResponse);
    }

    @GetMapping("/semester/current")
    public ResponseEntity<ProjectCurrentSemesterResponse> getCurrentSemester() {
        ProjectCurrentSemesterResponse response = new ProjectCurrentSemesterResponse(
            projectService.getCurrentSemester()
        );
        return ResponseEntity.ok(response);
    }

    // TODO: 파일과 객체가 같이 생성되고 있음
    // TODO: 입력 값 변경해야함
    @PostMapping(consumes = { MediaType.MULTIPART_FORM_DATA_VALUE })
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
        content = @Content(
            encoding = @Encoding(name = "project", contentType = MediaType.APPLICATION_JSON_VALUE)
        )
    )
    public ResponseEntity<String> createProject(
        @CurrentUser UserPrincipal userPrincipal,
        @RequestPart(value = "image", required = false) List<MultipartFile> imageFiles,
        @RequestPart(value = "thumbnail", required = false) MultipartFile thumbnailFile,
        @RequestPart("project") ProjectRequest request
    ) throws IOException {
        // RequestPart 중 ContentType 형식이 서로 다른 file 2종류를 ProjectCreateRequest 에 할당하여 새로운 RequestDto 객체 생성
        ProjectRequest fullRequest = ProjectRequest.builder()
            .recruitmentPositions(request.getRecruitmentPositions())
            .title(request.getTitle())
            .projectType(request.getProjectType())
            .content(request.getContent())
            .summary(request.getSummary())
            .password(request.getPassword())
            .teamMember(request.getTeamMember())
            .techStack(request.getTechStack())
            .image(request.getImage())
            .imageFiles(imageFiles)
            .thumbnail(request.getThumbnail())
            .thumbnailFiles(thumbnailFile)
            .build();

        // 비밀번호가 null 인지 체크
        validatePassword(fullRequest.getPassword());

        String result = projectService.save(fullRequest, userPrincipal);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<ProjectDetailsResponse> getProject(
        @PathVariable("projectId") Long projectId,
        @CurrentUser UserPrincipal userPrincipal
    ) {
        ProjectDetailsResponse projectDetails = projectService.getProjectDetails(
            projectId,
            userPrincipal
        );
        return ResponseEntity.ok(projectDetails);
    }

    @GetMapping("/{projectId}/update")
    public ResponseEntity<ProjectDetailsResponse> getProjectDetailsForUpdate(
        @PathVariable("projectId") Long projectId,
        @CurrentUser UserPrincipal userPrincipal
    ) {
        // 프로젝트 상세 정보를 가져오는 서비스 호출
        ProjectDetailsResponse response = projectService.getProjectDetailsForUpdate(
            projectId,
            userPrincipal
        );
        return ResponseEntity.ok(response);
    }

    @PutMapping("{projectId}")
    public ResponseEntity<String> updateProject(
        @PathVariable("projectId") Long projectId,
        @CurrentUser UserPrincipal userPrincipal,
        @RequestPart(value = "image", required = false) List<MultipartFile> imageFiles,
        @RequestPart(value = "thumbnail", required = false) MultipartFile thumbnailFile,
        @RequestPart("project") ProjectRequest request
    ) throws IOException {
        // RequestPart 중 ContentType 형식이 서로 다른 file 2종류를 ProjectRequest 에 할당
        request.setMultipartFiles(thumbnailFile, imageFiles);

        // 비밀번호가 null 인지 체크
        validatePassword(request.getPassword());

        String result = projectService.update(projectId, request, userPrincipal);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @DeleteMapping("{projectId}")
    public ResponseEntity<Void> deleteProject(
        @PathVariable("projectId") Long projectId,
        @CurrentUser UserPrincipal user
    ) {
        projectService.delete(projectId, user);
        return ResponseEntity.noContent().build();
    }

    private void validatePassword(String password) {
        if (password == null) {
            throw new BadRequestException("비밀번호를 입력하세요.");
        }
    }
}
