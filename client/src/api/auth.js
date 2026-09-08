import apiClient from "./client";
import axios from "axios";

export const authApi = {
  // 기존 쿠키의 만료된 토큰을 보내지 않고 새 개발 세션을 발급받는다.
  loginDev: async (sessionId, accountNumber) => {
    const response = await axios.post(
      `${process.env.REACT_APP_API_BASE_URL || "http://localhost:8080"}/auth/login-dev`,
      { sessionId, accountNumber },
      { timeout: 30000 },
    );
    return response.data;
  },
  // 토큰 유효성 검증
  verifyToken: () => apiClient.get("/oauth2/authorization/kakao"),

  // 카카오 로그인 URL 생성
  getKakaoLoginUrl: (redirectUri) => {
    const baseUrl = apiClient.defaults.baseURL.replace(/\/+$/, "");
    return `${baseUrl}/oauth2/authorization/kakao?redirect_uri=${redirectUri}`;
  },
};
