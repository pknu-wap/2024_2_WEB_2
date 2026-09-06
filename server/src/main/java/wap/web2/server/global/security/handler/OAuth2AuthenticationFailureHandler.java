package wap.web2.server.global.security.handler;

import static wap.web2.server.global.security.oauth2.HttpCookieOAuth2AuthorizationRequestRepository.REDIRECT_URI_PARAM_COOKIE_NAME;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;
import wap.web2.server.exception.ErrorCode;
import wap.web2.server.global.security.oauth2.HttpCookieOAuth2AuthorizationRequestRepository;
import wap.web2.server.util.CookieUtils;

@Component
@Slf4j
@RequiredArgsConstructor
public class OAuth2AuthenticationFailureHandler extends SimpleUrlAuthenticationFailureHandler {

    private final HttpCookieOAuth2AuthorizationRequestRepository httpCookieOAuth2AuthorizationRequestRepository;

    @Override
    public void onAuthenticationFailure(
        HttpServletRequest request,
        HttpServletResponse response,
        AuthenticationException exception
    ) throws IOException, ServletException {
        String targetUrl = CookieUtils.getCookie(request, REDIRECT_URI_PARAM_COOKIE_NAME)
            .map(Cookie::getValue)
            .orElse("/");

        log.warn("OAuth2 로그인에 실패했습니다. path={}", request.getRequestURI(), exception);

        targetUrl = UriComponentsBuilder.fromUriString(targetUrl)
            .queryParam("code", ErrorCode.AUTH_OAUTH2_FAILURE.getCode())
            .queryParam("message", ErrorCode.AUTH_OAUTH2_FAILURE.getDefaultMessage())
            .build()
            .encode()
            .toUriString();

        httpCookieOAuth2AuthorizationRequestRepository.removeAuthorizationRequestCookies(
            request,
            response
        );

        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
