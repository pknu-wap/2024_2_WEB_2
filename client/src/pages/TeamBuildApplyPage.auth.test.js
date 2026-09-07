import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { teamBuildApi } from "../api/team-build";
import TeamBuildApplyPage from "./TeamBuildApplyPage";

jest.mock("js-cookie", () => ({ get: () => "shared-cookie-token" }));
jest.mock("../api/team-build", () => ({
  teamBuildApi: {
    getApplyStatus: jest.fn().mockResolvedValue({ hasApplied: false }),
    getApplyProjects: jest.fn().mockResolvedValue([]),
  },
}));

const originalNodeEnv = process.env.NODE_ENV;
let alertSpy;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NODE_ENV = "development";
  sessionStorage.clear();
  localStorage.setItem("authToken", "old-local-token");
  alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
});

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  sessionStorage.clear();
  localStorage.clear();
  alertSpy.mockRestore();
});

function openPage() {
  render(
    <MemoryRouter initialEntries={["/apply"]}>
      <Routes>
        <Route path="/apply" element={<TeamBuildApplyPage />} />
        <Route path="/login" element={<h1>로그인 화면</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

test.each([
  {},
  { authToken: "expired-tab-token", expiresAt: "2000-01-01T00:00:00Z" },
])(
  "로그아웃 또는 만료된 탭에서는 공유 토큰으로 지원 목록을 조회하지 않는다: %j",
  async (session) => {
    sessionStorage.setItem("waps.devLogin", JSON.stringify(session));
    openPage();
    await screen.findByRole("heading", { name: "로그인 화면" });
    expect(alertSpy).toHaveBeenCalledWith("로그인이 필요합니다.");
    expect(teamBuildApi.getApplyStatus).not.toHaveBeenCalled();
    expect(teamBuildApi.getApplyProjects).not.toHaveBeenCalled();
  },
);

test("유효한 탭 세션에서는 지원 상태와 프로젝트 목록을 조회한다", async () => {
  sessionStorage.setItem(
    "waps.devLogin",
    JSON.stringify({
      authToken: "tab-token",
      expiresAt: "2099-01-01T00:00:00Z",
    }),
  );
  openPage();
  await screen.findByRole("heading", { name: "지원가능한 프로젝트" });
  expect(alertSpy).not.toHaveBeenCalled();
  expect(teamBuildApi.getApplyStatus).toHaveBeenCalledTimes(1);
  expect(teamBuildApi.getApplyProjects).toHaveBeenCalledTimes(1);
});
