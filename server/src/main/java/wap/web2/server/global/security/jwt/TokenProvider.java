package wap.web2.server.global.security.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.time.Instant;
import org.springframework.beans.factory.ObjectProvider;
import wap.web2.server.auth.DevLoginSessionValidator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import wap.web2.server.exception.ErrorCode;
import wap.web2.server.global.security.UserPrincipal;
import wap.web2.server.global.security.config.AppProperties;

@Slf4j
@Service
public class TokenProvider {

    private final AppProperties appProperties;
    private final Key key;
    private final ObjectProvider<DevLoginSessionValidator> devSessions;

    public TokenProvider(AppProperties appProperties, ObjectProvider<DevLoginSessionValidator> devSessions) {
        this.appProperties = appProperties;
        this.devSessions = devSessions;
        this.key = Keys.hmacShaKeyFor(
            appProperties.getAuth().getTokenSecret().getBytes(StandardCharsets.UTF_8)
        );
    }

    public String createToken(Authentication authentication) {
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();

        Date now = new Date();
        Date expiryDate = new Date(
            now.getTime() + appProperties.getAuth().getTokenExpirationMsec()
        );

        return Jwts.builder()
            .setSubject(Long.toString(userPrincipal.getId()))
            .setIssuedAt(now)
            .setExpiration(expiryDate)
            .signWith(key, SignatureAlgorithm.HS512)
            .compact();
    }

    public String createDevToken(Authentication authentication, String tokenId, Instant expiresAt) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        return Jwts.builder()
            .setSubject(Long.toString(principal.getId()))
            .setId(tokenId)
            .claim("devLogin", true)
            .setIssuedAt(new Date())
            .setExpiration(Date.from(expiresAt))
            .signWith(key, SignatureAlgorithm.HS512)
            .compact();
    }

    public String createRefreshToken(Authentication authentication) {
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();

        Date now = new Date();
        Date expiryDate = new Date(
            now.getTime() + appProperties.getAuth().getRefreshTokenExpirationMsec()
        );

        return Jwts.builder()
            .setSubject(Long.toString(userPrincipal.getId()))
            .setIssuedAt(now)
            .setExpiration(expiryDate)
            .signWith(key, SignatureAlgorithm.HS512)
            .compact();
    }

    public Long getUserIdFromToken(String token) {
        Claims claims = Jwts.parser().setSigningKey(key).build().parseClaimsJws(token).getBody();

        return Long.parseLong(claims.getSubject());
    }

    public boolean validateToken(String authToken) {
        return getAccessTokenErrorCode(authToken) == null;
    }

    public ErrorCode getAccessTokenErrorCode(String authToken) {
        try {
            Claims claims = Jwts.parser().setSigningKey(key).build().parseClaimsJws(authToken).getBody();
            if (Boolean.TRUE.equals(claims.get("devLogin", Boolean.class))) {
                var validator = devSessions.getIfAvailable();
                if (validator == null || !validator.isActive(claims.getId(), Long.valueOf(claims.getSubject()))) {
                    return ErrorCode.AUTH_INVALID_TOKEN;
                }
            }
            return null;
        } catch (SecurityException | MalformedJwtException ex) {
            log.warn("유효하지 않은 JWT 서명입니다. message={}", ex.getMessage());
            return ErrorCode.AUTH_INVALID_TOKEN;
        } catch (ExpiredJwtException ex) {
            log.warn("만료된 JWT 토큰입니다. message={}", ex.getMessage());
            return ErrorCode.AUTH_TOKEN_EXPIRED;
        } catch (UnsupportedJwtException ex) {
            log.warn("지원하지 않는 JWT 토큰입니다. message={}", ex.getMessage());
            return ErrorCode.AUTH_INVALID_TOKEN;
        } catch (IllegalArgumentException ex) {
            log.warn("JWT 토큰이 비어 있습니다. message={}", ex.getMessage());
            return ErrorCode.AUTH_INVALID_TOKEN;
        }
    }
}
