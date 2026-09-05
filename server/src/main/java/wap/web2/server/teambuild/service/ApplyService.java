package wap.web2.server.teambuild.service;

import static wap.web2.server.util.SemesterGenerator.generateSemester;

import java.util.ArrayList;
import java.util.List;
import java.util.HashSet;
import java.util.Set;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import wap.web2.server.admin.entity.TeamBuildingMeta;
import wap.web2.server.admin.entity.TeamBuildingStatus;
import wap.web2.server.admin.repository.TeamBuildingMetaRepository;
import wap.web2.server.exception.BadRequestException;
import wap.web2.server.exception.ConflictException;
import wap.web2.server.exception.ForbiddenException;
import wap.web2.server.exception.ResourceNotFoundException;
import wap.web2.server.global.security.UserPrincipal;
import wap.web2.server.member.entity.User;
import wap.web2.server.member.repository.UserRepository;
import wap.web2.server.project.entity.Project;
import wap.web2.server.project.repository.ProjectRepository;
import wap.web2.server.teambuild.dto.RecruitmentDto;
import wap.web2.server.teambuild.dto.RecruitmentDto.RecruitmentInfo;
import wap.web2.server.teambuild.dto.request.ProjectAppliesRequest;
import wap.web2.server.teambuild.dto.request.ProjectAppliesRequest.ApplyRequest;
import wap.web2.server.teambuild.dto.response.ProjectAppliesResponse;
import wap.web2.server.teambuild.entity.Position;
import wap.web2.server.teambuild.entity.ProjectApply;
import wap.web2.server.teambuild.entity.ProjectRecruit;
import wap.web2.server.teambuild.entity.ProjectRecruitWish;
import wap.web2.server.teambuild.repository.ProjectApplyRepository;
import wap.web2.server.teambuild.repository.ProjectRecruitRepository;
import wap.web2.server.teambuild.repository.ProjectRecruitWishRepository;

@Slf4j
@Service
@RequiredArgsConstructor
public class ApplyService {

    private final TeamBuildingMetaRepository teamBuildingMetaRepository;
    private final ProjectRecruitWishRepository recruitWishRepository;
    private final ProjectRecruitRepository recruitRepository;
    private final ProjectApplyRepository applyRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    @Transactional
    public void apply(UserPrincipal userPrincipal, ProjectAppliesRequest request) {
        apply(userPrincipal, request, 1);
    }

    @Transactional
    public void apply(UserPrincipal userPrincipal, ProjectAppliesRequest request, int round) {
        validateRound(round);
        if (!isTeamApplyOpen(round)) {
            throw new ConflictException("현재 팀빌딩 상태에서는 지원할 수 없습니다.");
        }

        // Serialize submissions by the same applicant so concurrent requests cannot exceed five.
        User user = userRepository.findByIdForUpdate(userPrincipal.getId())
            .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));
        List<ApplyRequest> applies = request.getApplies();
        List<ProjectApply> existing = applyRepository.findAllByUserIdAndSemesterAndRound(
            user.getId(), generateSemester(), round);
        if (applies == null || applies.isEmpty() || existing.size() + applies.size() > 5) {
            throw new BadRequestException("차수별 지원은 1개 이상 5개 이하만 가능합니다.");
        }
        Set<ApplicationChoice> choices = new HashSet<>();
        existing.forEach(a -> choices.add(new ApplicationChoice(a.getProject().getProjectId(), a.getPosition())));
        for (ApplyRequest entry : applies) {
            if (entry == null || entry.getProjectId() == null ||
                !choices.add(new ApplicationChoice(entry.getProjectId(), parsePosition(entry.getPosition())))) {
                throw new BadRequestException("동일한 프로젝트와 직무에 중복 지원할 수 없습니다.");
            }
        }
        int priority = existing.stream().mapToInt(ProjectApply::getPriority).max().orElse(0) + 1;

        for (ApplyRequest applyRequest : applies) {
            Project project = findProject(applyRequest.getProjectId());
            log.info(
                "apply-user:{},priority:{},project:{}",
                userPrincipal.getName(),
                priority,
                project.getTitle()
            );

            applyRepository.save(
                    ProjectApply.builder()
                            .priority(priority++)
                            .round(round)
                            .position(parsePosition(applyRequest.getPosition()))
                            .comment(applyRequest.getComment())
                            .career(applyRequest.getExperience())
                            .user(user)
                            .project(project)
                            .build()
            );
        }
    }

    @Transactional(readOnly = true)
    public boolean hasRecruited(UserPrincipal userPrincipal, Long projectId) {
        return hasRecruited(userPrincipal, projectId, 1);
    }

    @Transactional(readOnly = true)
    public boolean hasRecruited(UserPrincipal userPrincipal, Long projectId, int round) {
        validateRound(round);
        User user = findUser(userPrincipal.getId());
        Project project = findProject(projectId);

        if (!project.isOwner(user)) {
            throw new ForbiddenException("프로젝트 열람 권한이 없습니다.");
        }

        return recruitRepository.existsByProjectIdAndSemesterAndRound(projectId, generateSemester(), round);
    }

    @Transactional(readOnly = true)
    public ProjectAppliesResponse getApplies(UserPrincipal userPrincipal, Long projectId) {
        return getApplies(userPrincipal, projectId, 1);
    }

    @Transactional(readOnly = true)
    public ProjectAppliesResponse getApplies(UserPrincipal userPrincipal, Long projectId, int round) {
        validateRound(round);
        User user = findUser(userPrincipal.getId());
        Project project = findProject(projectId);

        if (!project.isOwner(user)) {
            throw new ForbiddenException("프로젝트 열람 권한이 없습니다.");
        }

        List<ProjectApply> applies = applyRepository.findAllByProjectAndSemesterAndRound(project, generateSemester(), round);
        log.info("getApplies-user:{}", user.getName());

        return ProjectAppliesResponse.fromEntities(applies);
    }

    @Transactional(readOnly = true)
    public ProjectAppliesResponse getRecruitPageData(UserPrincipal userPrincipal, Long projectId) {
        return getRecruitPageData(userPrincipal, projectId, 1);
    }

    @Transactional(readOnly = true)
    public ProjectAppliesResponse getRecruitPageData(UserPrincipal userPrincipal, Long projectId, int round) {
        validateRound(round);
        if (hasRecruited(userPrincipal, projectId, round)) {
            throw new ConflictException("이미 제출된 모집이 존재합니다.");
        }

        return getApplies(userPrincipal, projectId, round);
    }

    @Transactional
    public void setPreference(UserPrincipal userPrincipal, RecruitmentDto request) {
        setPreference(userPrincipal, request, 1);
    }

    @Transactional
    public void setPreference(UserPrincipal userPrincipal, RecruitmentDto request, int round) {
        validateRound(round);
        if (!isTeamRecruitOpen(round)) {
            throw new ConflictException("현재 팀빌딩 상태에서는 모집을 제출할 수 없습니다.");
        }

        User user = findUser(userPrincipal.getId());
        Project project = findProject(request.getProjectId());

        if (!project.isOwner(user)) {
            throw new ForbiddenException("프로젝트 모집 권한이 없습니다.");
        }

        log.info("setPreference-user:{},project:{}", user.getId(), project.getProjectId());

        List<RecruitmentInfo> roasters = request.getRoasters();
        RecruitmentPolicy.validate(roasters,
            applyRepository.findAllByProjectAndSemesterAndRound(project, generateSemester(), round), round);
        for (RecruitmentInfo roaster : roasters) {
            ProjectRecruit recruit = recruitRepository.save(
                ProjectRecruit.builder()
                    .round(round)
                    .leaderId(user.getId())
                    .projectId(project.getProjectId())
                    .position(parsePosition(roaster.getPosition()))
                    .capacity(roaster.getCapacity())
                    .build()
            );

            int priority = 1;
            List<ProjectRecruitWish> wishes = new ArrayList<>();
            for (long applicantId : roaster.getApplicantIds()) {
                ProjectRecruitWish wish = recruitWishRepository.save(
                    ProjectRecruitWish.builder()
                        .priority(priority++)
                        .applicantId(applicantId)
                        .recruit(recruit)
                        .build()
                );
                wishes.add(wish);
            }

            recruit.setWishList(wishes);
        }
    }

    @Transactional(readOnly = true)
    public boolean hasAppliedThisSemester(Long userId) {
        findUser(userId);
        int round = teamBuildingMetaRepository.findBySemester(generateSemester())
            .map(TeamBuildingMeta::getRound).orElse(1);
        return !applyRepository.findAllByUserIdAndSemesterAndRound(userId, generateSemester(), round).isEmpty();
    }

    private void validateRound(int round) {
        if (round != 1 && round != 2) {
            throw new BadRequestException("지원 및 모집 차수는 1 또는 2여야 합니다.");
        }
    }

    private boolean isTeamApplyOpen(int round) {
        String semester = generateSemester();
        TeamBuildingMeta teamBuildingMeta = teamBuildingMetaRepository
            .findBySemester(semester)
            .orElseThrow(() ->
                new ConflictException("현재 학기의 팀빌딩이 초기화되지 않았습니다.")
            );

        return teamBuildingMeta.getRound() == round && teamBuildingMeta.getStatus() == TeamBuildingStatus.APPLY;
    }

    private boolean isTeamRecruitOpen(int round) {
        String semester = generateSemester();
        TeamBuildingMeta teamBuildingMeta = teamBuildingMetaRepository
            .findBySemester(semester)
            .orElseThrow(() ->
                new ConflictException("현재 학기의 팀빌딩이 초기화되지 않았습니다.")
            );

        return teamBuildingMeta.getRound() == round && teamBuildingMeta.getStatus() == TeamBuildingStatus.RECRUIT;
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

    private record ApplicationChoice(Long projectId, Position position) {}

    private Position parsePosition(String position) {
        try {
            return Position.valueOf(position.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new BadRequestException("유효하지 않은 포지션입니다.");
        }
    }
}
