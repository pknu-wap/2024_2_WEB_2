package wap.web2.server.ouath2.security.oauth2.user;

import wap.web2.server.exception.OAuth2AuthenticationProcessingException;
import wap.web2.server.domain.AuthProvider;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

public class OAuth2UserInfoFactory {

    public static OAuth2UserInfo getOAuth2UserInfo(OAuth2UserRequest oAuth2UserRequest, Map<String, Object> attributes) {
        String registrationId = oAuth2UserRequest.getClientRegistration().getRegistrationId();

        if (registrationId.equalsIgnoreCase(AuthProvider.kakao.toString())) {
            return makeKakaoUserInfo(attributes);
        }
        else {
            throw new OAuth2AuthenticationProcessingException("Sorry! Login with " + registrationId + " is not supported yet.");
        }
    }


    public static OAuth2UserInfo makeKakaoUserInfo(Map<String, Object> attributes){
        Map<String, Object> kakaoUserInfo = new HashMap<>();
        kakaoUserInfo.put("id", String.valueOf(attributes.get("id")));
        LinkedHashMap<String, Object> temporaryProperties = (LinkedHashMap<String, Object>) attributes.get("properties");
        kakaoUserInfo.put("nickname", temporaryProperties.get("nickname"));
        kakaoUserInfo.put("picture", temporaryProperties.get("profile_image"));
        LinkedHashMap<String, Object> temporaryProperties2 = (LinkedHashMap<String, Object>) attributes.get("kakao_account");
        kakaoUserInfo.put("email", temporaryProperties2.get("email"));

        return new KakaoOAuth2UserInfo(kakaoUserInfo);
    }

}