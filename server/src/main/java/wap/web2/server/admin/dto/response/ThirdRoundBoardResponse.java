package wap.web2.server.admin.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import wap.web2.server.teambuild.entity.Position;

public record ThirdRoundBoardResponse(String semester, long revision, List<TeamCard> teams,
                                      List<Member> unassigned, boolean completed) {
    public ThirdRoundBoardResponse(String semester, long revision, List<TeamCard> teams, List<Member> unassigned) {
        this(semester, revision, teams, unassigned, false);
    }
    public record TeamCard(Long id, Long projectId, String teamName, boolean isCreated,
                           List<Member> members) {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Member(String id, String type, String name, Position position) {}
}
