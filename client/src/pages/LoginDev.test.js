import React, { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { authApi } from "../api/auth";
import { getDevSessionId, saveDevSession } from "../utils/authStorage";
import LoginDev from "./LoginDev";

jest.mock("../utils/authStorage", () => ({ getDevSessionId: jest.fn(() => "session-id"), saveDevSession: jest.fn() }));
jest.mock("../api/auth", () => ({ authApi: { loginDev: jest.fn() } }));
const originalLocation = window.location;

function openPage(path = "/login-dev") {
  render(<StrictMode><MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/login-dev" element={<LoginDev />} />
    <Route path="/login" element={<p>Kakao login</p>} />
  </Routes></MemoryRouter></StrictMode>);
}

const originalNodeEnv = process.env.NODE_ENV;

beforeEach(() => {
  jest.clearAllMocks();
  getDevSessionId.mockReturnValue("session-id");
  process.env.NODE_ENV = "development";
  delete window.location;
  window.location = { replace: jest.fn() };
});
afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  window.location = originalLocation;
});

test("disabled builds never request a development account", async () => {
  process.env.NODE_ENV = "production";
  openPage();
  await screen.findByText("Kakao login");
  expect(authApi.loginDev).not.toHaveBeenCalled();
  expect(getDevSessionId).not.toHaveBeenCalled();
});

test("automatically allocates once even in StrictMode and saves a tab session", async () => {
  const session = { accessToken: "signed-token", userName: "테스트 사용자 1", role: "ROLE_MEMBER", expiresAt: "2099-01-01T00:00:00Z" };
  authApi.loginDev.mockResolvedValue(session);
  openPage();
  await waitFor(() => expect(window.location.replace).toHaveBeenCalledWith("/ProjectPage"));
  expect(authApi.loginDev).toHaveBeenCalledTimes(1);
  expect(authApi.loginDev).toHaveBeenCalledWith("session-id", undefined);
  expect(saveDevSession).toHaveBeenCalledWith(session);
});

test.each([
  [new Error("Network error"), "실패"],
  [{ response: { status: 409, data: { message: "테스트 계정 100개가 모두 사용 중입니다." } } }, "100개"],
])("failed allocation shows an error without saving a session", async (failure, message) => {
  authApi.loginDev.mockRejectedValue(failure);
  openPage();
  expect((await screen.findByRole("alert")).textContent).toContain(message);
  expect(saveDevSession).not.toHaveBeenCalled();
});


test.each([1, 100])("logs in with requested test account %s once", async (id) => {
  const session = { accessToken: "signed-token", userName: `테스트 사용자 ${id}`, expiresAt: "2099-01-01T00:00:00Z" };
  authApi.loginDev.mockResolvedValue(session);
  openPage(`/login-dev?id=${id}`);
  await waitFor(() => expect(window.location.replace).toHaveBeenCalledWith("/ProjectPage"));
  expect(authApi.loginDev).toHaveBeenCalledTimes(1);
  expect(authApi.loginDev).toHaveBeenCalledWith("session-id", id);
  expect(saveDevSession).toHaveBeenCalledWith(session);
});

test.each(["", "0", "101", "-1", "1.5", "abc", "1e1"])("rejects invalid id '%s' without allocating an account", async (id) => {
  openPage(`/login-dev?id=${id}`);
  expect((await screen.findByRole("alert")).textContent).toContain("1~100");
  expect(authApi.loginDev).not.toHaveBeenCalled();
  expect(saveDevSession).not.toHaveBeenCalled();
});

test("shows the requested account conflict without redirecting", async () => {
  authApi.loginDev.mockRejectedValue({ response: { status: 409, data: { message: "테스트 계정 1번이 사용 중입니다." } } });
  openPage("/login-dev?id=1");
  expect((await screen.findByRole("alert")).textContent).toContain("1번이 사용 중");
  expect(window.location.replace).not.toHaveBeenCalled();
  expect(saveDevSession).not.toHaveBeenCalled();
});
