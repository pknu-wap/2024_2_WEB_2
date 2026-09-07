import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import TeamBuildResultPage from "./TeamBuildResultPage";
import { teamBuildApi } from "../api/team-build";

jest.mock("../api/team-build", () => ({
  teamBuildApi: { getTeamBuildResults: jest.fn() },
}));
jest.mock("../components/Header", () => () => null);
jest.mock("../components/Menu", () => () => null);
jest.mock("../components/FloatingButton", () => () => null);

test("3차 생성 팀은 팀장 없이 인원과 명단을 표시하고 복사할 수 있다", async () => {
  teamBuildApi.getTeamBuildResults.mockResolvedValueOnce({
    results: [
      {
        planTeamId: 20,
        projectId: null,
        teamName: "팀 A",
        leader: null,
        members: [{ id: 12, name: "김다은", position: "APP" }],
      },
    ],
    unassigned: [{ id: 13, name: "이준호", position: "AI" }],
  });
  const originalClipboard = navigator.clipboard;
  const originalAlert = window.alert;
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: jest.fn().mockResolvedValue() },
  });
  window.alert = jest.fn();
  try {
    render(<TeamBuildResultPage />);
    expect(await screen.findByText("팀 A")).toBeInTheDocument();
    expect(screen.getByText("미지정")).toBeInTheDocument();
    expect(screen.getByText("김다은")).toBeInTheDocument();
    expect(screen.getByText("이준호")).toBeInTheDocument();
    expect(screen.getByText(/총 인원:/)).toHaveTextContent("총 인원: 1명");
    fireEvent.click(screen.getByRole("button", { name: "명단복사" }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "팀명: 팀 A / 팀장: 미지정 / 팀원: 김다은·APP",
    );
    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith("팀 명단이 복사되었습니다!"),
    );
  } finally {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: originalClipboard,
    });
    window.alert = originalAlert;
  }
});
