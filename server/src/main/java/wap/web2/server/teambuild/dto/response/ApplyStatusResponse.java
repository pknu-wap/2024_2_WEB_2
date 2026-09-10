package wap.web2.server.teambuild.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ApplyStatusResponse {

    private boolean hasApplied;
    private boolean assigned;
}
