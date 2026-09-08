import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import TeamBuildPage from "./TeamBuildPage";
import { teamBuildApi } from "../api/team-build";

jest.mock("../api/team-build", () => ({ teamBuildApi: {
  getRecruitProjects: jest.fn(), getRecruitApplies: jest.fn(),
  getStatus: jest.fn(), closeRecruitment: jest.fn(),
} }));
jest.mock("../utils/authStorage", () => ({ get: () => "test" }));

beforeEach(() => {
  jest.clearAllMocks();
  teamBuildApi.getStatus.mockResolvedValue({ round: 1, completedRound: 0, status: "RECRUIT" });
  teamBuildApi.closeRecruitment.mockResolvedValue("팀 모집이 마감되었습니다.");
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

const recruitedMembers = [{ memberId: 7, memberName: "기존 팀원", position: "BACKEND" }];

test("2차에서는 신청자가 없어도 1차 확정 팀원과 분야를 표시한다", async () => {
  teamBuildApi.getRecruitProjects.mockResolvedValue([{ projectId: 42, title: "내 프로젝트" }]);
  teamBuildApi.getRecruitApplies.mockResolvedValue({ applies: [], recruitedMembers });
  renderPage(2);
  expect(await screen.findByRole("heading", { name: "1차 모집된 팀원 (1명)" })).toBeInTheDocument();
  expect(screen.getByText("기존 팀원")).toBeInTheDocument();
  expect(screen.getByText("BACKEND")).toBeInTheDocument();
  expect(screen.getByText("기존 팀원").closest("[draggable]")).toBeNull();
  expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
});

test("1차 페이지에는 기존 팀원 영역을 표시하지 않는다", async () => {
  teamBuildApi.getRecruitProjects.mockResolvedValue([{ projectId: 42, title: "내 프로젝트" }]);
  teamBuildApi.getRecruitApplies.mockResolvedValue({ applies: [], recruitedMembers });
  renderPage(1);
  await waitFor(() => expect(screen.getByRole("button", { name: "희망 팀 제출하기" })).toBeEnabled());
  expect(screen.queryByText("기존 팀원")).not.toBeInTheDocument();
});

test("2차에서 확정 팀원이 없으면 안내한다", async () => {
  teamBuildApi.getRecruitProjects.mockResolvedValue([{ projectId: 42, title: "내 프로젝트" }]);
  renderPage(2);
  expect(await screen.findByText("1차에서 모집된 팀원이 없습니다.")).toBeInTheDocument();
});

test("프로젝트를 바꾸면 이전 프로젝트의 확정 팀원을 지운다", async () => {
  teamBuildApi.getRecruitProjects.mockResolvedValue([
    { projectId: 42, title: "첫 프로젝트" }, { projectId: 99, title: "둘째 프로젝트" },
  ]);
  teamBuildApi.getRecruitApplies.mockResolvedValueOnce({ applies: [], recruitedMembers })
    .mockResolvedValueOnce({ applies: [], recruitedMembers: [] });
  renderPage(2);
  const select = await screen.findByRole("combobox", { name: "모집할 프로젝트" });
  fireEvent.change(select, { target: { value: "42" } });
  fireEvent.click(screen.getByRole("button", { name: "불러오기" }));
  expect(await screen.findByText("기존 팀원")).toBeInTheDocument();
  fireEvent.change(select, { target: { value: "99" } });
  expect(screen.queryByText("기존 팀원")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "불러오기" }));
  expect(await screen.findByText("1차에서 모집된 팀원이 없습니다.")).toBeInTheDocument();
});


test.each([1, 2])("%i차 배정 후 신청자 조회 없이 모집을 마감한다", async round => {
  teamBuildApi.getStatus.mockResolvedValue({ round, completedRound: round, status: "CLOSED" });
  teamBuildApi.getRecruitProjects.mockResolvedValue([{ projectId: 42, title: "내 프로젝트" }]);
  renderPage(round);
  fireEvent.click(await screen.findByRole("button", { name: "내 프로젝트 팀 모집 마감" }));
  expect(await screen.findByText("모집 마감 완료")).toBeInTheDocument();
  expect(teamBuildApi.closeRecruitment).toHaveBeenCalledWith(42, round);
  expect(teamBuildApi.getRecruitApplies).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "희망 팀 제출하기" })).toBeDisabled();
});

test.each([0, 3])("배정 완료 차수가 %i이면 마감 버튼이 없다", async completedRound => {
  teamBuildApi.getStatus.mockResolvedValue({ round: 1, completedRound, status: "CLOSED" });
  teamBuildApi.getRecruitProjects.mockResolvedValue([{ projectId: 42, title: "내 프로젝트" }]);
  renderPage();
  await waitFor(() => expect(screen.queryByText("프로젝트를 불러오는 중...")).not.toBeInTheDocument());
  expect(screen.queryByRole("button", { name: "내 프로젝트 팀 모집 마감" })).not.toBeInTheDocument();
});

test("2차 지원 중에도 프로젝트별로 마감하고 오류 발생 시 재시도한다", async () => {
  teamBuildApi.getStatus.mockResolvedValue({ round: 2, completedRound: 1, status: "APPLY" });
  teamBuildApi.getRecruitProjects.mockResolvedValue([
    { projectId: 42, title: "첫 프로젝트" }, { projectId: 99, title: "둘째 프로젝트" },
  ]);
  teamBuildApi.closeRecruitment.mockRejectedValueOnce(new Error("마감 실패"));
  renderPage(2);
  fireEvent.click(await screen.findByRole("button", { name: "둘째 프로젝트 팀 모집 마감" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("마감 실패");
  fireEvent.click(screen.getByRole("button", { name: "둘째 프로젝트 팀 모집 마감" }));
  expect(await screen.findByText("모집 마감 완료")).toBeInTheDocument();
  expect(teamBuildApi.closeRecruitment).toHaveBeenLastCalledWith(99, 1);
  expect(screen.getByRole("button", { name: "첫 프로젝트 팀 모집 마감" })).toBeEnabled();
});

test("다시 방문해도 마감 완료 상태를 표시하고 모집 제출을 막는다", async () => {
  teamBuildApi.getStatus.mockResolvedValue({ round: 2, completedRound: 1, status: "RECRUIT" });
  teamBuildApi.getRecruitProjects.mockResolvedValue([{ projectId: 42, title: "내 프로젝트", recruitmentClosed: true }]);
  renderPage(2);
  expect(await screen.findByText("모집 마감 완료")).toBeInTheDocument();
  expect(teamBuildApi.getRecruitApplies).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "희망 팀 제출하기" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "불러오기" })).toBeDisabled();
});
