package wap.web2.server.vote.dto;

import static wap.web2.server.vote.service.VotePolicy.REQUIRED_VOTE_COUNT;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import wap.web2.server.util.Semester;

public record VoteRequest(
    @NotNull
    @Size(min = REQUIRED_VOTE_COUNT, max = REQUIRED_VOTE_COUNT, message = "{min}개의 프로젝트에 투표해야합니다.")
    List<Long> projectIds,

    @NotNull @Semester String semester
) {}
