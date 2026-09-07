import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import TeamBuildPage from "./TeamBuildPage";
import { teamBuildApi } from "../api/team-build";

jest.mock("../api/team-build", () => ({ teamBuildApi: {
  getRecruitProjects: jest.fn(), getRecruitApplies: jest.fn(),
} }));
jest.mock("../utils/authStorage", () => ({ get: () => "test" }));

beforeEach(() => {
  jest.clearAllMocks();
  teamBuildApi.getRecruitApplies.mockResolvedValue({ projectTitle: "내 프로젝트", applies: [] });
});

const renderPage = (round = 1) => render(<MemoryRouter><TeamBuildPage round={round} /></MemoryRouter>);

test.each([1, 2])("본인 프로젝트가 하나면 %i차 신청자를 자동으로 불러온다", async round => {
  teamBuildApi.getRecruitProjects.mockResolvedValue([{ projectId: 42, title: "내 프로젝트" }]);
  renderPage(round);
  await waitFor(() => expect(screen.getByRole("button", { name: "희망 팀 제출하기" })).toBeEnabled());
  expect(teamBuildApi.getRecruitApplies).toHaveBeenCalledWith(42, round);
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  expect(screen.queryByPlaceholderText("예) 1")).not.toBeInTheDocument();
});

test("프로젝트가 여러 개면 선택한 프로젝트만 불러온다", async () => {
  teamBuildApi.getRecruitProjects.mockResolvedValue([
    { projectId: 42, title: "첫 프로젝트" }, { projectId: 99, title: "둘째 프로젝트" },
  ]);
  renderPage();
  const select = await screen.findByRole("combobox", { name: "모집할 프로젝트" });
  expect(teamBuildApi.getRecruitApplies).not.toHaveBeenCalled();
  fireEvent.change(select, { target: { value: "99" } });
  fireEvent.click(screen.getByRole("button", { name: "불러오기" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "희망 팀 제출하기" })).toBeEnabled());
  expect(teamBuildApi.getRecruitApplies).toHaveBeenCalledWith(99, 1);
  fireEvent.change(select, { target: { value: "42" } });
  expect(screen.getByRole("button", { name: "희망 팀 제출하기" })).toBeDisabled();
});

test("본인 프로젝트가 없으면 안내하고 제출을 막는다", async () => {
  teamBuildApi.getRecruitProjects.mockResolvedValue([]);
  renderPage();
  expect(await screen.findByText("현재 학기에 등록한 프로젝트가 없습니다.")).toBeInTheDocument();
  expect(teamBuildApi.getRecruitApplies).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "희망 팀 제출하기" })).toBeDisabled();
});

test("목록 조회 실패 후 다시 시도할 수 있다", async () => {
  teamBuildApi.getRecruitProjects.mockRejectedValueOnce(new Error("조회 실패"))
    .mockResolvedValueOnce([{ projectId: 42, title: "내 프로젝트" }]);
  renderPage();
  fireEvent.click(await screen.findByRole("button", { name: "다시 시도" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "희망 팀 제출하기" })).toBeEnabled());
  expect(teamBuildApi.getRecruitApplies).toHaveBeenCalledWith(42, 1);
});
