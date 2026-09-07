package wap.web2.server.admin.controller;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.List;
import org.junit.jupiter.api.*;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import wap.web2.server.admin.dto.response.ThirdRoundBoardResponse;
import wap.web2.server.admin.service.ThirdRoundPlanService;
import wap.web2.server.exception.GlobalExceptionHandler;
import wap.web2.server.teambuild.entity.Position;

class AdminThirdRoundPlanControllerTest {
    private final ThirdRoundPlanService service = mock(ThirdRoundPlanService.class);
    @Configuration @EnableMethodSecurity static class Security {}
    @AfterEach void clearSecurity() { SecurityContextHolder.clearContext(); }

    @Test void onlyAdminsCanAccessBoardAndMutations() {
        new ApplicationContextRunner().withUserConfiguration(Security.class)
            .withBean(ThirdRoundPlanService.class, () -> service)
            .withBean(AdminThirdRoundPlanController.class)
            .run(ctx -> {
                var controller = ctx.getBean(AdminThirdRoundPlanController.class);
                assertThatThrownBy(controller::open).isInstanceOf(AuthenticationCredentialsNotFoundException.class);
                SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                    "member", "", List.of(new SimpleGrantedAuthority("ROLE_MEMBER"))));
                assertThatThrownBy(controller::get).isInstanceOf(AccessDeniedException.class);
                assertThatThrownBy(() -> controller.create(new wap.web2.server.admin.dto.request.ThirdRoundRevisionRequest(0L)))
                    .isInstanceOf(AccessDeniedException.class);
                assertThatThrownBy(() -> controller.shuffle(new wap.web2.server.admin.dto.request.ThirdRoundRevisionRequest(0L)))
                    .isInstanceOf(AccessDeniedException.class);
                SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                    "admin", "", List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
                controller.open(); verify(service).open();
            });
    }

    @Test void validatesRevisionAndDestinationAndSerializesNamelessSlots() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new AdminThirdRoundPlanController(service))
            .setControllerAdvice(new GlobalExceptionHandler()).build();
        String root = "/admin/team/building/third-round";
        for (String body : List.of("{}", "{\"revision\":-1}", "{\"revision\":null}")) {
            mvc.perform(post(root + "/teams").contentType("application/json").content(body)).andExpect(status().isBadRequest());
            mvc.perform(post(root + "/shuffle").contentType("application/json").content(body)).andExpect(status().isBadRequest());
        }
        mvc.perform(patch(root + "/slots/1").contentType("application/json")
            .content("{\"revision\":0,\"teamId\":-1}")).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
        when(service.open()).thenReturn(new ThirdRoundBoardResponse("2026-2", 0, List.of(), List.of(
            new ThirdRoundBoardResponse.Member("slot-1", "POSITION_SLOT", null, Position.FRONTEND))));
        mvc.perform(post(root + "/open")).andExpect(status().isOk())
            .andExpect(jsonPath("$.unassigned[0].name").doesNotExist())
            .andExpect(jsonPath("$.unassigned[0].userId").doesNotExist())
            .andExpect(jsonPath("$.unassigned[0].position").value("FRONTEND"));
        mvc.perform(patch(root + "/slots/1").contentType("application/json")
            .content("{\"revision\":0,\"teamId\":null}")).andExpect(status().isOk());
        verify(service).move(1, null, 0);
        mvc.perform(post(root + "/shuffle").contentType("application/json")
            .content("{\"revision\":3}")).andExpect(status().isOk());
        verify(service).shuffle(3);
    }
}
