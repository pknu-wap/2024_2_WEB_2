import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import TeamBuildEntryPage from "./TeamBuildEntryPage";
import { teamBuildApi } from "../api/team-build";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));
jest.mock("../components/LoadingPage", () => () => <div>로딩 중</div>);
jest.mock("../api/team-build", () => ({ teamBuildApi: { getRole: jest.fn(), getStatus: jest.fn() } }));

beforeEach(() => jest.resetAllMocks());

test.each([
  ["member", 1, "/team-build/projects"],
  ["leader", 1, "/team-build/recruit"],
  ["member", 2, "/team-build/projects/2nd"],
  ["leader", 2, "/team-build/recruit/2nd"],
  ["member", 3, "/team-build/result"],
  ["leader", 3, "/team-build/result"],
])("%s 역할의 %i차 페이지로 이동한다", async (role, round, path) => {
  teamBuildApi.getRole.mockResolvedValue({ role });
  teamBuildApi.getStatus.mockResolvedValue({ status: "APPLY", round });
  render(<TeamBuildEntryPage />);
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(path, { replace: true }));
});

test("차수 조회 실패 시 1차로 보내지 않고 재시도를 안내한다", async () => {
  teamBuildApi.getRole.mockResolvedValue({ role: "member" });
  teamBuildApi.getStatus.mockRejectedValue(new Error("failed"));
  render(<TeamBuildEntryPage />);
  expect(await screen.findByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  expect(mockNavigate).not.toHaveBeenCalled();
});

test("차수가 누락된 응답으로는 이동하지 않는다", async () => {
  teamBuildApi.getRole.mockResolvedValue({ role: "member" });
  teamBuildApi.getStatus.mockResolvedValue({});
  render(<TeamBuildEntryPage />);
  expect(await screen.findByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  expect(mockNavigate).not.toHaveBeenCalled();
});
