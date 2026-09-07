package wap.web2.server.admin.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import wap.web2.server.admin.dto.request.*;
import wap.web2.server.admin.dto.response.ThirdRoundBoardResponse;
import wap.web2.server.admin.service.ThirdRoundPlanService;

@RestController
@RequestMapping("/admin/team/building/third-round")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminThirdRoundPlanController {
    private final ThirdRoundPlanService service;

    @PostMapping("/open")
    public ThirdRoundBoardResponse open() { return service.open(); }

    @GetMapping
    public ThirdRoundBoardResponse get() { return service.get(); }

    @PostMapping("/teams")
    public ThirdRoundBoardResponse create(@Valid @RequestBody ThirdRoundRevisionRequest request) {
        return service.create(request.revision());
    }

    @PostMapping("/shuffle")
    public ThirdRoundBoardResponse shuffle(@Valid @RequestBody ThirdRoundRevisionRequest request) {
        return service.shuffle(request.revision());
    }

    @PatchMapping("/slots/{slotId}")
    public ThirdRoundBoardResponse move(@PathVariable long slotId,
                                       @Valid @RequestBody ThirdRoundMoveRequest request) {
        return service.move(slotId, request.teamId(), request.revision());
    }

    @DeleteMapping("/teams/{teamId}")
    public ThirdRoundBoardResponse delete(@PathVariable long teamId,
                                         @Valid @RequestBody ThirdRoundRevisionRequest request) {
        return service.delete(teamId, request.revision());
    }
}
