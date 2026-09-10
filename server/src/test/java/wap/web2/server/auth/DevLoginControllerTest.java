package wap.web2.server.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DevLoginControllerTest {
    private final DevLoginService service = mock(DevLoginService.class);
    private final ApplicationContextRunner context = new ApplicationContextRunner()
        .withBean(DevLoginService.class, () -> service)
        .withUserConfiguration(DevLoginController.class);

    @Test
    void endpointIsAbsentWithoutDevelop() {
        for (String profiles : new String[] {"", "oracle", "dev-login"}) {
            context.withPropertyValues("spring.profiles.active=" + profiles)
                .run(ctx -> assertTrue(ctx.getBeansOfType(DevLoginController.class).isEmpty()));
        }
    }

    @Test
    void oracleAndDevelopWorkWithoutConfiguredUser() {
        context.withPropertyValues("spring.profiles.active=oracle,develop")
            .run(ctx -> assertNotNull(ctx.getBean(DevLoginController.class)));
    }

    @Test
    void acceptsAccountNumberAndRejectsOutOfRangeNumbers() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new DevLoginController(service)).build();
        UUID session = UUID.randomUUID();
        for (int number : new int[] {0, -1, 101}) {
            mvc.perform(post("/auth/login-dev").contentType("application/json")
                .content("{\"sessionId\":\"" + session + "\",\"accountNumber\":" + number + "}"))
                .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(service);
        for (int number : new int[] {1, 100}) {
            mvc.perform(post("/auth/login-dev").contentType("application/json")
                .content("{\"sessionId\":\"" + session + "\",\"accountNumber\":" + number + "}"))
                .andExpect(status().isOk());
            verify(service).login(session, number);
        }
    }

    @Test
    void requiresValidSessionIdentifier() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new DevLoginController(service)).build();
        for (String body : new String[] {"{}", "{\"sessionId\":\"invalid\"}"}) {
            mvc.perform(post("/auth/login-dev").contentType("application/json").content(body))
                .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(service);
        UUID id = UUID.randomUUID();
        mvc.perform(post("/auth/login-dev").contentType("application/json")
            .content("{\"sessionId\":\"" + id + "\"}")).andExpect(status().isOk());
        verify(service).login(id, null);
    }
}
