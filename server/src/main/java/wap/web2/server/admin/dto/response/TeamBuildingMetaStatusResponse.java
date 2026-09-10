package wap.web2.server.admin.dto.response;

import wap.web2.server.admin.entity.TeamBuildingStatus;
import wap.web2.server.admin.entity.TeamBuildingMeta;

public record TeamBuildingMetaStatusResponse(TeamBuildingStatus status, int round, int completedRound) {
    public static TeamBuildingMetaStatusResponse of(TeamBuildingMeta meta) {
        return new TeamBuildingMetaStatusResponse(meta.getStatus(), meta.getRound(), meta.getCompletedRound());
    }
}
