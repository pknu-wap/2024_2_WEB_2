package wap.web2.server.project.service;

import static wap.web2.server.storage.StoragePathUtils.IMAGES;
import static wap.web2.server.storage.StoragePathUtils.PROJECT_DIR;
import static wap.web2.server.storage.StoragePathUtils.THUMBNAIL;
import static wap.web2.server.util.SemesterGenerator.generateSemester;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import wap.web2.server.exception.ForbiddenException;
import wap.web2.server.exception.ProjectPasswordInvalidException;
import wap.web2.server.exception.ResourceNotFoundException;
import wap.web2.server.global.security.UserPrincipal;
import wap.web2.server.member.entity.Role;
import wap.web2.server.member.entity.User;
import wap.web2.server.member.repository.UserRepository;
import wap.web2.server.project.dto.RecruitmentPositionDto;
import wap.web2.server.project.dto.request.ProjectRequest;
import wap.web2.server.project.dto.response.ProjectDetailsResponse;
import wap.web2.server.project.dto.response.ProjectInfoResponse;
import wap.web2.server.project.entity.Image;
import wap.web2.server.project.entity.Project;
import wap.web2.server.project.repository.ProjectRepository;
import wap.web2.server.storage.ObjectStorageService;
import wap.web2.server.teambuild.dto.response.ProjectTemplate;
import wap.web2.server.teambuild.dto.response.RecruitProjectResponse;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ObjectStorageService objectStorageService;

    @Value("${project.password}")
    private String projectPassword;

    public String getCurrentSemester() {
        return generateSemester();
    }

    // TODO: 비밀번호 체크 로직이 각 메서드 마다 있음
    // TODO: "비밀번호가 틀렸습니다." 를 반환하면 컨트롤러에서 401 에러를 내보내는데, 유연하지 못하다고 생각됩니다.
    @CacheEvict(value = "projectList", allEntries = true)
    @Transactional
    public String save(ProjectRequest request, UserPrincipal userPrincipal) throws IOException {
        if (request.getPassword() == null || !request.getPassword().equals(projectPassword)) {
            throw new ProjectPasswordInvalidException();
        }

        RecruitmentPositionDto.toEntities(request.getRecruitmentPositions());
        User user = findUser(userPrincipal.getId());
        String semester = getCurrentSemester();

        List<MultipartFile> imageFiles = getNonEmptyImageFiles(request);
        List<String> imageUrls = Collections.emptyList();
        if (!imageFiles.isEmpty()) {
            imageUrls = objectStorageService.uploadImages(
                PROJECT_DIR,
                semester,
                request.getTitle(),
                IMAGES,
                imageFiles
            );
        }

        String thumbnailUrl = "";
        if (hasFile(request.getThumbnailFiles())) {
            thumbnailUrl = objectStorageService.uploadImage(
                PROJECT_DIR,
                semester,
                request.getTitle(),
                THUMBNAIL,
                request.getThumbnailFiles()
            );
        }

        // request.toEntity() 를 호출함으로서 매개변수로 넘어온 객체(request)를 사용
        // 기괴한 구조 ㄷㄷ
        Project project = request.toEntity(request, semester, imageUrls, thumbnailUrl, user);

        // 양방향 연관관계 데이터 일관성 유지
        project.getTechStacks().forEach(techStack -> techStack.updateTechStack(project));
        project.getTeamMembers().forEach(teamMember -> teamMember.updateTeamMember(project));
        project.getImages().forEach(image -> image.updateImage(project));

        log.info("[INFO ] 프로젝트 등록 시도 : {}", userPrincipal.getName());
        log.info("[INFO ] 프로젝트 등록 정보 : {}", request);
        projectRepository.save(project);
        log.info("[INFO ] 프로젝트 등록 완료 : {}", userPrincipal.getName());

        return "등록되었습니다.";
    }

    @Cacheable(value = "projectList", key = "#semester")
    @Transactional(readOnly = true)
    public List<ProjectInfoResponse> getProjects(String semester) {
        return projectRepository
            .findProjectsBySemesterOrderByProjectIdDesc(semester)
            .stream()
            .map(ProjectInfoResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ProjectTemplate> getCurrentProjectRecruits() {
        return projectRepository
            .findProjectsBySemester(generateSemester())
            .stream()
            .map(ProjectTemplate::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public ProjectDetailsResponse getProjectDetails(Long projectId, UserPrincipal userPrincipal) {
        Project project = findProject(projectId);

        ProjectDetailsResponse projectDetailsResponse = ProjectDetailsResponse.from(project);

        if (userPrincipal != null) {
            User user = findUser(userPrincipal.getId());
            projectDetailsResponse.changeIsOwner(project.isOwner(user));
            projectDetailsResponse.changeCanManage(canManage(project, user));
        }

        return projectDetailsResponse;
    }

    @CacheEvict(value = "projectList", allEntries = true)
    @Transactional(readOnly = true)
    public ProjectDetailsResponse getProjectDetailsForUpdate(
        Long projectId,
        UserPrincipal userPrincipal
    ) {
        if (userPrincipal == null) {
            throw new ForbiddenException("프로젝트 수정 권한이 없습니다.");
        }

        User user = findUser(userPrincipal.getId());
        log.info(
            "[수정 요청] - 유저ID: {}, 유저명: {}, 프로젝트ID: {}",
            user.getId(),
            user.getName(),
            projectId
        );
        Project project = findProject(projectId);

        if (!canManage(project, user)) {
            throw new ForbiddenException("프로젝트 수정 권한이 없습니다.");
        }

        return ProjectDetailsResponse.from(project)
            .changeIsOwner(project.isOwner(user))
            .changeCanManage(true);
    }

    @CacheEvict(value = "projectList", allEntries = true)
    @Transactional
    public String update(Long projectId, ProjectRequest request, UserPrincipal userPrincipal)
        throws IOException {
        if (request.getPassword() == null || !request.getPassword().equals(projectPassword)) {
            throw new ProjectPasswordInvalidException();
        }

        User user = findUser(userPrincipal.getId());
        Project project = findProject(projectId);

        if (!canManage(project, user)) {
            throw new ForbiddenException("프로젝트 수정 권한이 없습니다.");
        }

        RecruitmentPositionDto.toEntities(request.getRecruitmentPositions());

        // 썸네일 이미지가 없으면 유지 or 있으면 변경
        if (hasFile(request.getThumbnailFiles())) {
            log.info("[프로젝트 수정] ({})의 thumbnail 이미지 변경", project.getTitle());
            String thumbnailUrl = objectStorageService.uploadImage(
                PROJECT_DIR,
                project.getSemester(),
                request.getTitle(),
                THUMBNAIL,
                request.getThumbnailFiles()
            );
            project.updateThumbnail(thumbnailUrl);
        }

        // 기존 프로젝트의 이미지 삭제
        log.info("[프로젝트 수정] ({})의 삭제 요청된 이미지 삭제", project.getTitle());
        List<String> removedImageUrls = project.removeImages(getRemovalTargets(request));
        for (String imageUrl : removedImageUrls) {
            log.info("[프로젝트 수정] 삭제하려는 image url: {}", imageUrl);
            if (!objectStorageService.supports(imageUrl)) {
                log.info(
                    "[프로젝트 수정] 현재 스토리지에서 관리하지 않는 image url 이므로 물리 삭제를 건너뜁니다: {}",
                    imageUrl
                );
                continue;
            }
            objectStorageService.deleteImage(imageUrl);
        }

        // 추가 이미지를 Project에 삽입, 만약 ImageS3가 null이라면 skip
        List<MultipartFile> imageFiles = getNonEmptyImageFiles(request);
        if (!imageFiles.isEmpty()) {
            log.info("[프로젝트 수정] ({})에 이미지 추가", project.getTitle());
            List<String> imageUrls = objectStorageService.uploadImages(
                PROJECT_DIR,
                project.getSemester(),
                request.getTitle(),
                IMAGES,
                imageFiles
            );
            List<Image> images = Image.listOf(imageUrls);
            project.addAllImage(images);
        }

        // 썸네일, 이미지를 제외한 나머지 필드 수정
        project.update(request);

        return "수정되었습니다.";
    }

    @CacheEvict(value = "projectList", allEntries = true)
    @Transactional
    public void delete(Long projectId, UserPrincipal userPrincipal) {
        User user = findUser(userPrincipal.getId());
        Project project = findProject(projectId);

        if (!canManage(project, user)) {
            throw new ForbiddenException("프로젝트 삭제 권한이 없습니다.");
        }
        projectRepository.delete(project);
    }

    @Transactional(readOnly = true)
    public List<RecruitProjectResponse> getMyRecruitProjects(Long userId) {
        return projectRepository.findAllByUser_IdAndSemesterOrderByProjectIdDesc(userId, generateSemester())
            .stream()
            .map(project -> new RecruitProjectResponse(
                project.getProjectId(), project.getTitle()))
            .toList();
    }

    public boolean isLeader(Long userId) {
        User user = findUser(userId);

        // 이번 학기 모든 프로젝트를 찾아서 내가 주인인 프로젝트가 하나라도 있으면 true
        return projectRepository
            .findProjectsBySemester(generateSemester())
            .stream()
            .anyMatch(project -> project.isOwner(user));
    }

    private boolean canManage(Project project, User user) {
        return user.getRole() == Role.ROLE_ADMIN || project.isOwner(user);
    }

    private User findUser(Long userId) {
        return userRepository
            .findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));
    }

    private Project findProject(Long projectId) {
        return projectRepository
            .findById(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("프로젝트를 찾을 수 없습니다."));
    }

    private List<String> getRemovalTargets(ProjectRequest request) {
        if (request.getRemoval() == null) {
            return Collections.emptyList();
        }

        return request.getRemoval();
    }

    private List<MultipartFile> getNonEmptyImageFiles(ProjectRequest request) {
        if (request.getImageFiles() == null) {
            return Collections.emptyList();
        }

        return request.getImageFiles().stream().filter(this::hasFile).toList();
    }

    private boolean hasFile(MultipartFile file) {
        return file != null && !file.isEmpty();
    }
}
