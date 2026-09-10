import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ManageTeamBuildPage from "./ManageTeamBuildPage";
import { adminTeamBuildApi } from "../../api/admin";

jest.mock("../../api/admin", () => ({
  adminTeamBuildApi: {
    getTeamBuildStatus: jest.fn(),
    resetTeamBuild: jest.fn(),
    resetTeamBuildCompletely: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  adminTeamBuildApi.getTeamBuildStatus.mockResolvedValue({ status: "CLOSED", round: 3, completedRound: 3 });
  jest.spyOn(window, "confirm").mockReturnValue(true);
  jest.spyOn(window, "alert").mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

const renderReady = async () => {
  render(<ManageTeamBuildPage />);
  const button = screen.getByRole("button", { name: "팀 빌딩 초기화" });
  await waitFor(() => expect(button).toBeEnabled());
  return button;
};

test("취소하면 초기화 요청을 보내지 않는다", async () => {
  window.confirm.mockReturnValue(false);
  fireEvent.click(await renderReady());
  expect(adminTeamBuildApi.resetTeamBuild).not.toHaveBeenCalled();
});

test("초기화 중 중복 동작을 막고 완료 후 시작 단계로 갱신한다", async () => {
  let finishReset;
  adminTeamBuildApi.resetTeamBuild.mockImplementation(() => new Promise(resolve => { finishReset = resolve; }));
  fireEvent.click(await renderReady());
  expect(screen.getByRole("button", { name: "초기화 중..." })).toBeDisabled();
  expect(screen.getByRole("button", { name: "지원 CSV 다운로드" })).toBeDisabled();
  adminTeamBuildApi.getTeamBuildStatus.mockResolvedValue({ status: "OPEN", round: 1, completedRound: 0 });
  finishReset();
  await waitFor(() => expect(screen.getByRole("button", { name: "다음 단계 →" })).toBeEnabled());
  expect(adminTeamBuildApi.resetTeamBuild).toHaveBeenCalledTimes(1);
  expect(screen.getByText("시작").closest("li")).toHaveAttribute("aria-current", "step");
});

test("요청 실패 시 기존 단계를 유지하고 다시 시도할 수 있다", async () => {
  adminTeamBuildApi.resetTeamBuild.mockRejectedValue(new Error("failed"));
  fireEvent.click(await renderReady());
  await waitFor(() => expect(window.alert).toHaveBeenCalledWith("팀 빌딩 초기화에 실패했습니다."));
  expect(screen.getByRole("button", { name: "팀 빌딩 초기화" })).toBeEnabled();
  expect(screen.getByText("결과").closest("li")).toHaveAttribute("aria-current", "step");
});


test("완전 초기화는 삭제 범위를 안내하고 취소 시 요청하지 않는다", async () => {
  await renderReady();
  window.confirm.mockReturnValue(false);
  fireEvent.click(screen.getByRole("button", { name: "팀 빌딩 완전 초기화" }));
  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("모든 차수의 지원·모집 데이터(희망 지원자 포함)"));
  expect(adminTeamBuildApi.resetTeamBuildCompletely).not.toHaveBeenCalled();
  expect(adminTeamBuildApi.resetTeamBuild).not.toHaveBeenCalled();
});

test("완전 초기화 중 다른 작업을 막고 성공 후 시작 단계로 갱신한다", async () => {
  let finishReset;
  adminTeamBuildApi.resetTeamBuildCompletely.mockImplementation(() => new Promise(resolve => { finishReset = resolve; }));
  await renderReady();
  fireEvent.click(screen.getByRole("button", { name: "팀 빌딩 완전 초기화" }));
  expect(screen.getByRole("button", { name: "완전 초기화 중..." })).toBeDisabled();
  expect(screen.getByRole("button", { name: "팀 빌딩 초기화" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "지원 CSV 다운로드" })).toBeDisabled();
  adminTeamBuildApi.getTeamBuildStatus.mockResolvedValue({ status: "OPEN", round: 1, completedRound: 0 });
  finishReset();
  await waitFor(() => expect(screen.getByRole("button", { name: "팀 빌딩 완전 초기화" })).toBeEnabled());
  expect(adminTeamBuildApi.resetTeamBuildCompletely).toHaveBeenCalledTimes(1);
  expect(adminTeamBuildApi.resetTeamBuild).not.toHaveBeenCalled();
  expect(screen.getByText("시작").closest("li")).toHaveAttribute("aria-current", "step");
});

test("완전 초기화 실패 시 결과 단계를 유지하고 재시도할 수 있다", async () => {
  adminTeamBuildApi.resetTeamBuildCompletely.mockRejectedValue(new Error("failed"));
  await renderReady();
  fireEvent.click(screen.getByRole("button", { name: "팀 빌딩 완전 초기화" }));
  await waitFor(() => expect(window.alert).toHaveBeenCalledWith("팀 빌딩 완전 초기화에 실패했습니다."));
  expect(screen.getByRole("button", { name: "팀 빌딩 완전 초기화" })).toBeEnabled();
  expect(screen.getByText("결과").closest("li")).toHaveAttribute("aria-current", "step");
});
