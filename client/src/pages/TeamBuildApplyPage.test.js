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

async function renderApplyPage(round) {
  render(
    <MemoryRouter>
      <TeamBuildApplyPage round={round} />
    </MemoryRouter>,
  );
  await screen.findAllByRole("button", { name: "지원서 작성하기" });
}

function openNewApplication() {
  fireEvent.click(
    screen.getAllByRole("button", { name: "지원서 작성하기" })[0],
  );
}

function fillApplication(values) {
  const form = within(screen.getByRole("dialog"));
  const labels = {
    position: "지원 직무",
    career: "경력",
    message: "간단 자기소개 및 PR 메시지",
  };
  for (const [field, value] of Object.entries(values)) {
    fireEvent.change(form.getByLabelText(labels[field]), { target: { value } });
  }
}

function saveApplication() {
  const form = within(screen.getByRole("dialog"));
  fireEvent.click(form.getByRole("button", { name: "지원서 저장하기" }));
}

test.each([1, 2])(
  "%i차 경력 자동 입력과 개별 수정, 자기소개 60자 제한",
  async (round) => {
    await renderApplyPage(round);
    openNewApplication();
    fillApplication({
      position: "BACKEND",
      career: "웹 개발 경험",
      message: "가".repeat(61),
    });
    expect(
      screen.getByLabelText("간단 자기소개 및 PR 메시지").value,
    ).toHaveLength(60);
    saveApplication();
    openNewApplication();
    expect(screen.getByLabelText("경력").value).toBe("웹 개발 경험");
    fillApplication({
      position: "APP",
      career: "앱 개발 경험",
      message: "함께하고 싶습니다",
    });
    saveApplication();
    fireEvent.click(
      screen.getByRole("button", { name: "지원서 수정하기 (백엔드)" }),
    );
    expect(screen.getByLabelText("경력").value).toBe("웹 개발 경험");
    fireEvent.click(screen.getByRole("button", { name: "지원서 닫기" }));
    openNewApplication();
    expect(screen.getByLabelText("경력").value).toBe("앱 개발 경험");
    fireEvent.click(
      screen.getByRole("button", { name: "지원서 수정하기 (백엔드)" }),
    );
    expect(screen.getByLabelText("경력").value).toBe("웹 개발 경험");
    expect(screen.getByLabelText("지원 직무").value).toBe("BACKEND");
  },
);

test.each([1, 2])(
  "%i차 지원서를 작성하고 우선순위대로 최종 제출한다",
  async (round) => {
    teamBuildApi.submitApply.mockClear();
    await renderApplyPage(round);
    expect(screen.queryByRole("button", { name: "최종 제출하기" })).toBeNull();

    for (const position of ["BACKEND", "APP", "GAME"]) {
      openNewApplication();
      fillApplication({
        position: position,
        career: "개발 경험",
        message: "함께하고 싶습니다",
      });
      saveApplication();
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

test.each([1, 2])(
  "%i차 지원서 검증, 수정, 닫기와 취소 상태를 유지한다",
  async (round) => {
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
    try {
      await renderApplyPage(round);
      openNewApplication();
      saveApplication();
      expect(alertSpy).toHaveBeenLastCalledWith("지원 직무를 선택해주세요.");
      fillApplication({ position: "BACKEND", message: "  " });
      saveApplication();
      expect(alertSpy).toHaveBeenLastCalledWith(
        "자기소개 및 PR 메시지를 작성해주세요.",
      );
      fillApplication({ message: " 첫 지원 ", career: " 저장한 경력 " });
      saveApplication();

      fireEvent.click(
        screen.getByRole("button", { name: "+ 지원서 추가 작성하기" }),
      );
      fillApplication({ position: "BACKEND", message: "중복 지원" });
      saveApplication();
      expect(alertSpy).toHaveBeenLastCalledWith(
        "이미 이 프로젝트의 같은 직무에 지원했습니다.",
      );
      expect(screen.getByLabelText("현재 지원서 1개")).toBeTruthy();
      fillApplication({ career: "저장하지 않은 경력" });
      fireEvent.click(screen.getByRole("button", { name: "지원서 닫기" }));

      fireEvent.click(
        screen.getByRole("button", { name: "지원서 수정하기 (백엔드)" }),
      );
      expect(screen.getByLabelText("경력").value).toBe("저장한 경력");
      expect(screen.getByLabelText("간단 자기소개 및 PR 메시지").value).toBe(
        "첫 지원",
      );
      fillApplication({ career: " 수정한 경력 " });
      saveApplication();
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.getByLabelText("현재 지원서 1개")).toBeTruthy();
      openNewApplication();
      expect(screen.getByLabelText("경력").value).toBe("수정한 경력");
      expect(screen.getByLabelText("지원 직무").value).toBe("");
      expect(screen.getByLabelText("간단 자기소개 및 PR 메시지").value).toBe(
        "",
      );
      fireEvent.click(screen.getByRole("button", { name: "지원서 닫기" }));

      fireEvent.click(
        screen.getByRole("button", { name: "웹 프로젝트 지원 취소" }),
      );
      expect(screen.getByLabelText("현재 지원서 1개")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "지원 취소하기" }));
      expect(screen.getByLabelText("현재 지원서 0개")).toBeTruthy();
      expect(screen.queryByRole("alertdialog")).toBeNull();
    } finally {
      alertSpy.mockRestore();
    }
  },
);
