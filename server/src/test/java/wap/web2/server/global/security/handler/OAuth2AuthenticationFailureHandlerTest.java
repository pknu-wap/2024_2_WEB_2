package wap.web2.server.global.security.handler;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import jakarta.servlet.http.Cookie;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import wap.web2.server.exception.ErrorCode;
import wap.web2.server.global.security.oauth2.HttpCookieOAuth2AuthorizationRequestRepository;

class OAuth2AuthenticationFailureHandlerTest {

    @ParameterizedTest
    @ValueSource(booleans = { false, true })
    void redirectsWithAsciiLocationAndPreservesKoreanError(boolean hasRedirectCookie)
        throws Exception {
        var repository = mock(HttpCookieOAuth2AuthorizationRequestRepository.class);
        var handler = new OAuth2AuthenticationFailureHandler(repository);
        var request = new MockHttpServletRequest("GET", "/oauth2/callback/kakao");
        var response = new MockHttpServletResponse();
        String target = hasRedirectCookie ? "https://waps.im/oauth/callback" : "/";
        if (hasRedirectCookie) {
            request.setCookies(new Cookie("redirect_uri", target));
        }

        handler.onAuthenticationFailure(
            request, response, new OAuth2AuthenticationException("invalid_state_parameter")
        );

        assertEquals(302, response.getStatus());
        String location = response.getHeader("Location");
        assertNotNull(location);
        assertTrue(location.chars().allMatch(character -> character < 128));
        assertTrue(location.startsWith(target + "?"));
        String query = URLDecoder.decode(URI.create(location).getRawQuery(), StandardCharsets.UTF_8);
        assertEquals(
            "code=AUTH_OAUTH2_FAILURE&message=" + ErrorCode.AUTH_OAUTH2_FAILURE.getDefaultMessage(),
            query
        );
        verify(repository).removeAuthorizationRequestCookies(request, response);
    }
}
