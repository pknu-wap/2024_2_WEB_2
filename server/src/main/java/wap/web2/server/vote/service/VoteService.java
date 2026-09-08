package wap.web2.server.vote.service;

import static wap.web2.server.vote.service.VotePolicy.REQUIRED_VOTE_COUNT;

import static wap.web2.server.util.SemesterGenerator.generateSemester;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import wap.web2.server.admin.entity.VoteMeta;
import wap.web2.server.admin.entity.VoteStatus;
import wap.web2.server.admin.repository.VoteMetaRepository;
import wap.web2.server.exception.BadRequestException;
import wap.web2.server.exception.ConflictException;
import wap.web2.server.exception.ForbiddenException;
import wap.web2.server.exception.ResourceNotFoundException;
import wap.web2.server.global.security.UserPrincipal;
import wap.web2.server.member.entity.Role;
import wap.web2.server.member.entity.User;
import wap.web2.server.member.repository.UserRepository;
import wap.web2.server.vote.dto.ProjectVoteCount;
import wap.web2.server.vote.dto.VoteInfoResponse;
import wap.web2.server.vote.dto.VoteParticipants;
import wap.web2.server.vote.dto.VoteParticipantsResponse;
import wap.web2.server.vote.dto.VoteRequest;
import wap.web2.server.vote.dto.VoteResultResponse;
import wap.web2.server.vote.dto.VoteResultsResponse;
import wap.web2.server.vote.entity.Ballot;
import wap.web2.server.vote.repository.BallotRepository;

@Slf4j
@Service
@RequiredArgsConstructor
public class VoteService {

    private final UserRepository userRepository;
    private final BallotRepository ballotRepository;
    private final VoteMetaRepository voteMetaRepository;

    @Transactional
    public void vote(UserPrincipal userPrincipal, VoteRequest voteRequest) {
        Long userId = userPrincipal.getId();
        Role userRole = resolveUserRole(userPrincipal);
        String semester = voteRequest.semester();

        VoteMeta voteMeta = findVoteMeta(semester);
        if (voteMeta.getStatus() != VoteStatus.VOTING) {
            throw new ConflictException(
                String.format("%s 학기의 투표가 진행 중이 아닙니다.", semester)
            );
        }

        List<Long> projectIds = voteRequest.projectIds();
        validateUserBallot(semester, userId);
        validateParticipatingProjects(semester, userId, projectIds, voteMeta.getId());

        for (Long projectId : projectIds) {
            ballotRepository.save(Ballot.of(semester, userId, userRole, projectId));
        }
    }

    @Transactional(readOnly = true)
    public VoteInfoResponse getVoteInfo(UserPrincipal userPrincipal, String semester) {
        User user = findUser(userPrincipal.getId());
        VoteStatus voteStatus = findVoteStatus(semester);

        long votedCount = ballotRepository.countBallotsBySemesterAndUserId(semester, user.getId());
        boolean isVotedUser = votedCount > 0;
        boolean isOpen = voteStatus == VoteStatus.VOTING;

        return VoteInfoResponse.builder().isVotedUser(isVotedUser).isOpen(isOpen).build();
    }

    @Cacheable(value = "voteResults", key = "#semester")
    @Transactional(readOnly = true)
    public VoteResultsResponse getVoteResults(String semester) {
        validateResultVisibility(semester);

        List<ProjectVoteCount> projectVoteCounts = ballotRepository.countVotesByProject(semester);
        long totalVotes = calculateTotalVotes(projectVoteCounts);

        List<VoteResultResponse> results = projectVoteCounts
            .stream()
            .map(projectVoteCount -> VoteResultResponse.of(projectVoteCount, totalVotes))
            .toList();

        return VoteResultsResponse.of(semester, results);
    }

    @Cacheable(value = "voteResults", key = "'latest'")
    @Transactional(readOnly = true)
    public VoteResultsResponse getMostRecentResults() {
        String currentSemester = generateSemester();
        String latestSemester = ballotRepository.findPublicLatestSemester(
            currentSemester,
            VoteStatus.ENDED
        );
        List<ProjectVoteCount> latestVotes = ballotRepository.findPublicLatestBallots(
            latestSemester
        );

        if (latestVotes.isEmpty()) {
            throw new ResourceNotFoundException("공개된 투표 결과가 없습니다.");
        }

        long totalVotes = calculateTotalVotes(latestVotes);
        List<VoteResultResponse> results = latestVotes
            .stream()
            .map(latestVote -> VoteResultResponse.of(latestVote, totalVotes))
            .toList();

        return VoteResultsResponse.of(latestSemester, results);
    }

    @Transactional(readOnly = true)
    public List<VoteParticipantsResponse> getParticipants(String semester) {
        List<VoteParticipants> participants = voteMetaRepository.findParticipantsProjectBySemester(
            semester
        );
        return participants.stream().map(VoteParticipantsResponse::from).toList();
    }

    private User findUser(Long userId) {
        return userRepository
            .findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));
    }

    private Role resolveUserRole(UserPrincipal userPrincipal) {
        String role = userPrincipal
            .getUserRole()
            .orElseThrow(() -> new ForbiddenException("사용자 권한 정보가 존재하지 않습니다."));
        return Role.from(role);
    }

    private VoteMeta findVoteMeta(String semester) {
        return voteMetaRepository
            .findBySemester(semester)
            .orElseThrow(() -> new ResourceNotFoundException("투표를 찾을 수 없습니다."));
    }

    private VoteStatus findVoteStatus(String semester) {
        return voteMetaRepository
            .findStatusBySemester(semester)
            .orElseThrow(() -> new ResourceNotFoundException("투표를 찾을 수 없습니다."));
    }

    private long calculateTotalVotes(List<ProjectVoteCount> projectVoteCounts) {
        return projectVoteCounts.stream().mapToLong(ProjectVoteCount::getVoteCount).sum();
    }

    private void validateUserBallot(String semester, Long userId) {
        long votedCount = ballotRepository.countBallotsBySemesterAndUserId(semester, userId);
        if (votedCount >= REQUIRED_VOTE_COUNT) {
            throw new BadRequestException("투표는 최대 " + REQUIRED_VOTE_COUNT + "개까지 가능합니다.");
        }
    }

    private void validateParticipatingProjects(
        String semester,
        Long userId,
        List<Long> projectIds,
        Long voteMetaId
    ) {
        Set<Long> participants = voteMetaRepository.findParticipantsByVoteMetaId(voteMetaId);

        Set<Long> invalidIds = projectIds
            .stream()
            .filter(projectId -> !participants.contains(projectId))
            .collect(Collectors.toSet());

        if (!invalidIds.isEmpty()) {
            log.warn(
                "유효하지 않은 투표 대상이 포함되었습니다. semester={}, userId={}, requestProjectIds={}, invalidProjectIds={}, allowedProjectIds={}",
                semester,
                userId,
                projectIds,
                invalidIds,
                participants
            );
            throw new BadRequestException("투표 대상이 아닌 프로젝트가 포함되어 있습니다.");
        }
    }

    private void validateResultVisibility(String semester) {
        boolean isPublic = voteMetaRepository.isResultPublic(semester);
        if (!isPublic) {
            throw new ForbiddenException("해당 투표 결과는 비공개입니다.");
        }
    }
}
