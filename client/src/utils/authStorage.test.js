import Cookies from "js-cookie";
import authStorage, { getDevSessionId, saveDevSession, clearDevSession } from "./authStorage";

jest.mock("js-cookie", () => ({ get: jest.fn(), set: jest.fn(), remove: jest.fn() }));
const session = { accessToken: "tab-token", userName: "테스트 사용자 1", role: "ROLE_MEMBER", expiresAt: "2099-01-01T00:00:00Z" };

const originalNodeEnv = process.env.NODE_ENV;

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  process.env.NODE_ENV = "development";
  window.fetch = jest.fn().mockResolvedValue({});
  Object.defineProperty(window, "crypto", { configurable: true, value: { randomUUID: jest.fn(() => "new-session") } });
});
afterEach(() => process.env.NODE_ENV = originalNodeEnv);

test("a tab reuses its allocation ID and does not write shared auth cookies", () => {
  expect(getDevSessionId()).toBe(getDevSessionId());
  expect(window.crypto.randomUUID).toHaveBeenCalledTimes(1);
  saveDevSession(session);
  expect(authStorage.get("authToken")).toBe("tab-token");
  expect(Cookies.set).not.toHaveBeenCalled();
  const storedTab = sessionStorage.getItem("waps.devLogin");
  sessionStorage.clear(); // A new tab has a separate storage area.
  saveDevSession({ ...session, accessToken: "second-tab-token" });
  expect(authStorage.get("authToken")).toBe("second-tab-token");
  sessionStorage.setItem("waps.devLogin", storedTab);
  expect(authStorage.get("authToken")).toBe("tab-token");
});

test("logout releases the allocation and never falls back to another account's cookies", () => {
  getDevSessionId();
  saveDevSession(session);
  Cookies.get.mockReturnValue("other-user");
  authStorage.remove("authToken");
  expect(window.fetch).toHaveBeenCalledWith(expect.stringContaining("/auth/login-dev/release"), expect.objectContaining({
    body: JSON.stringify({ sessionId: "new-session" }), keepalive: true,
  }));
  expect(authStorage.get("authToken")).toBeUndefined();
  expect(authStorage.get("userRole")).toBeUndefined();
  expect(sessionStorage.getItem("waps.devLogin.requestId")).toBeNull();
});

test("expired tab sessions stop authenticating", () => {
  saveDevSession({ ...session, expiresAt: "2000-01-01T00:00:00Z" });
  expect(authStorage.get("authToken")).toBeUndefined();
});

test("normal login and production builds keep using cookies", () => {
  saveDevSession(session);
  clearDevSession();
  authStorage.set("authToken", "kakao-token", { expires: 7 });
  expect(Cookies.set).toHaveBeenCalledWith("authToken", "kakao-token", { expires: 7 });
  saveDevSession(session);
  process.env.NODE_ENV = "production";
  Cookies.get.mockReturnValue("production-token");
  expect(authStorage.get("authToken")).toBe("production-token");
});
