import { authApi } from "./auth";
import apiClient from "./client";

jest.mock("axios", () => ({ post: jest.fn() }));

jest.mock("./client", () => ({
  __esModule: true,
  default: { defaults: { baseURL: "http://localhost:8080" } },
}));

test.each([
  ["http://localhost:8080", "http://localhost:8080"],
  ["https://api.example.com/", "https://api.example.com"],
])("로그인 주소는 공통 API 서버 주소 %s를 사용한다", (baseURL, expected) => {
  apiClient.defaults.baseURL = baseURL;
  const redirect = encodeURIComponent("http://localhost:3000/oauth/callback");
  expect(authApi.getKakaoLoginUrl(redirect)).toBe(
    `${expected}/oauth2/authorization/kakao?redirect_uri=${redirect}`,
  );
});
