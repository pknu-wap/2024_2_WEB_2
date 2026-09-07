import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { teamBuildApi } from "../api/team-build";
import TeamBuildApplyPage from "./TeamBuildApplyPage";

jest.mock("js-cookie", () => ({ get: () => "test-token" }));
jest.mock("../api/team-build", () => ({
  teamBuildApi: {
    submitApply: jest.fn().mockResolvedValue({}),
    getApplyStatus: async () => ({ hasApplied: false }),
    getApplyProjects: async () => [
      {
        projectId: 1,
        title: "웹 프로젝트",
        projectType: "WEB",
        recruitPositions: ["BACKEND"],
      },
      {
        projectId: 2,
        title: "앱 프로젝트",
        projectType: "APP",
        recruitPositions: ["APP"],
      },
      {
        projectId: 3,
        title: "게임 프로젝트",
        projectType: "GAME",
        recruitPositions: ["GAME"],
      },
    ],
  },
}));

test.each([1, 2])(
  "%i차 경력 자동 입력과 개별 수정, 자기소개 60자 제한",
  async (round) => {
    render(
      <MemoryRouter>
        <TeamBuildApplyPage round={round} />
      </MemoryRouter>,
    );
    await screen.findAllByRole("button", { name: "지원서 작성하기" });
    const open = () => {
      fireEvent.click(
        screen.getAllByRole("button", { name: "지원서 작성하기" })[0],
      );
    };
    open();
    fireEvent.change(screen.getByLabelText("지원 직무"), {
      target: { value: "BACKEND" },
    });
    fireEvent.change(screen.getByLabelText("경력"), {
      target: { value: "웹 개발 경험" },
    });
    fireEvent.change(screen.getByLabelText("간단 자기소개 및 PR 메시지"), {
      target: { value: "가".repeat(61) },
    });
    expect(
      screen.getByLabelText("간단 자기소개 및 PR 메시지").value,
    ).toHaveLength(60);
    fireEvent.click(screen.getByRole("button", { name: "지원서 저장하기" }));
    open();
    expect(screen.getByLabelText("경력").value).toBe("웹 개발 경험");
    fireEvent.change(screen.getByLabelText("지원 직무"), {
      target: { value: "APP" },
    });
    fireEvent.change(screen.getByLabelText("경력"), {
      target: { value: "앱 개발 경험" },
    });
    fireEvent.change(screen.getByLabelText("간단 자기소개 및 PR 메시지"), {
      target: { value: "함께하고 싶습니다" },
    });
    fireEvent.click(screen.getByRole("button", { name: "지원서 저장하기" }));
    fireEvent.click(
      screen.getByRole("button", { name: "지원서 수정하기 (백엔드)" }),
    );
    expect(screen.getByLabelText("경력").value).toBe("웹 개발 경험");
    fireEvent.click(screen.getByRole("button", { name: "지원서 닫기" }));
    open();
    expect(screen.getByLabelText("경력").value).toBe("앱 개발 경험");
  },
);

test.each([1, 2])(
  "%i차 지원서를 작성하고 우선순위대로 최종 제출한다",
  async (round) => {
    teamBuildApi.submitApply.mockClear();
    render(
      <MemoryRouter>
        <TeamBuildApplyPage round={round} />
      </MemoryRouter>,
    );
    await screen.findAllByRole("button", { name: "지원서 작성하기" });
    expect(screen.queryByRole("button", { name: "최종 제출하기" })).toBeNull();

    for (const position of ["BACKEND", "APP", "GAME"]) {
      fireEvent.click(
        screen.getAllByRole("button", { name: "지원서 작성하기" })[0],
      );
      const form = within(screen.getByRole("dialog"));
      fireEvent.change(form.getByLabelText("지원 직무"), {
        target: { value: position },
      });
      fireEvent.change(form.getByLabelText("경력"), {
        target: { value: "개발 경험" },
      });
      fireEvent.change(form.getByLabelText("간단 자기소개 및 PR 메시지"), {
        target: { value: "함께하고 싶습니다" },
      });
      fireEvent.click(form.getByRole("button", { name: "지원서 저장하기" }));
    }

    expect(Boolean(screen.queryByRole("combobox", { name: "주요 직무" }))).toBe(
      round === 1,
    );
    if (round === 1) {
      fireEvent.change(screen.getByRole("combobox", { name: "주요 직무" }), {
        target: { value: "BACKEND" },
      });
    }
    fireEvent.click(screen.getByRole("button", { name: "최종 제출하기" }));
    const confirmation = within(screen.getByRole("alertdialog"));
    expect(
      confirmation.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual([
      "1웹 프로젝트·백엔드",
      "2앱 프로젝트·앱",
      "3게임 프로젝트·게임",
    ]);
    expect(teamBuildApi.submitApply).not.toHaveBeenCalled();
    fireEvent.click(
      confirmation.getByRole("button", { name: "최종 제출하기" }),
    );
    await screen.findByRole("heading", { name: "지원이 완료되었습니다." });
    expect(teamBuildApi.submitApply).toHaveBeenCalledTimes(1);
    expect(teamBuildApi.submitApply).toHaveBeenCalledWith(
      {
        applies: ["BACKEND", "APP", "GAME"].map((position, index) => ({
          projectId: index + 1,
          position,
          comment: "함께하고 싶습니다",
          career: "개발 경험",
        })),
      },
      round,
    );
  },
);
