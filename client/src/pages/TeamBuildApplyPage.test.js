import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { teamBuildApi } from "../api/team-build";
import TeamBuildApplyPage from "./TeamBuildApplyPage";

jest.mock("js-cookie", () => ({ get: () => "test-token" }));
jest.mock("../api/team-build", () => ({
  teamBuildApi: {
    submitApply: jest.fn().mockResolvedValue({}),
    getApplyStatus: jest.fn(),
    getApplyProjects: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  teamBuildApi.getApplyStatus.mockResolvedValue({ hasApplied: false, assigned: false });
  teamBuildApi.getApplyProjects.mockResolvedValue([
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
  ]);
});

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
    const countBadge = screen.getByLabelText("현재 지원서 2개");
    expect(countBadge.textContent).toBe("2");
    expect(countBadge.hasAttribute("aria-describedby")).toBe(false);
    expect(countBadge.hasAttribute("tabindex")).toBe(false);
    expect(
      screen.getByText("최소 2개의 지원서를 작성해야합니다."),
    ).toBeTruthy();
    expect(screen.queryByRole("tooltip")).toBeNull();
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
  "%i차 지원서 2개를 작성하고 우선순위대로 최종 제출한다",
  async (round) => {
    teamBuildApi.submitApply.mockClear();
    await renderApplyPage(round);
    expect(screen.queryByRole("button", { name: "최종 제출하기" })).toBeNull();

    for (const position of ["BACKEND", "APP"]) {
      openNewApplication();
      fillApplication({
        position: position,
        career: "개발 경험",
        message: "함께하고 싶습니다",
      });
      saveApplication();
      if (position === "BACKEND") {
        expect(screen.queryByRole("button", { name: "최종 제출하기" })).toBeNull();
        expect(
          screen.getByLabelText("현재 지원서 1개").getAttribute("aria-describedby"),
        ).toBe("application-count-hint");
      }
    }

    const countBadge = screen.getByLabelText("현재 지원서 2개");
    expect(countBadge.textContent).toBe("2");
    expect(countBadge.hasAttribute("aria-describedby")).toBe(false);
    expect(
      screen.getByText("최소 2개의 지원서를 작성해야합니다."),
    ).toBeTruthy();
    expect(screen.queryByRole("tooltip")).toBeNull();

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
    ]);
    expect(teamBuildApi.submitApply).not.toHaveBeenCalled();
    fireEvent.click(
      confirmation.getByRole("button", { name: "최종 제출하기" }),
    );
    await screen.findByRole("heading", { name: "지원이 완료되었습니다." });
    expect(teamBuildApi.submitApply).toHaveBeenCalledTimes(1);
    expect(teamBuildApi.submitApply).toHaveBeenCalledWith(
      {
        applies: ["BACKEND", "APP"].map((position, index) => ({
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

test.each([
  [1, undefined],
  [2, undefined],
  [1, null],
  [2, null],
  [1, "BACKEND"],
  [2, "BACKEND"],
])(
  "%i차 프로젝트의 직무 목록 %s를 기본 직무로 보완하고 지원서를 저장한다",
  async (round, recruitPositions) => {
    teamBuildApi.getApplyProjects.mockResolvedValueOnce([
      {
        projectId: 10,
        title: "서버 프로젝트",
        summary: "프로젝트 소개",
        projectType: "WEB",
        techStack: ["React"],
        ...(recruitPositions === undefined ? {} : { recruitPositions }),
      },
    ]);
    await renderApplyPage(round);
    const card = within(screen.getByRole("article"));
    expect(card.getByText("백엔드")).toBeTruthy();
    expect(card.getByText("프론트엔드")).toBeTruthy();
    openNewApplication();
    const form = within(screen.getByRole("dialog"));
    expect(form.getAllByRole("option").map((option) => option.value)).toEqual([
      "",
      "FRONTEND",
      "BACKEND",
      "DESIGN",
      "AI",
      "APP",
      "EMBEDDED",
      "GAME",
    ]);
    fillApplication({ position: "BACKEND", message: "함께 개발하고 싶습니다" });
    saveApplication();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByLabelText("현재 지원서 1개")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "지원서 수정하기 (백엔드)" }),
    ).toBeTruthy();
  },
);

test.each([[[]], [["BACKEND"]]])(
  "서버에서 명시한 직무 목록 %j는 그대로 유지한다",
  async (recruitPositions) => {
    teamBuildApi.getApplyProjects.mockResolvedValueOnce([
      {
        projectId: 10,
        title: "직무 지정 프로젝트",
        projectType: "WEB",
        recruitPositions,
      },
    ]);
    await renderApplyPage(1);
    openNewApplication();
    const form = within(screen.getByRole("dialog"));
    expect(form.getAllByRole("option").map((option) => option.value)).toEqual([
      "",
      ...recruitPositions,
    ]);
  },
);


test.each([false, true])("배정된 팀원은 2차 지원 화면에 진입할 수 없다 (지원 여부: %s)", async (hasApplied) => {
  teamBuildApi.getApplyStatus.mockResolvedValue({ hasApplied, assigned: true });
  render(<MemoryRouter><TeamBuildApplyPage round={2} /></MemoryRouter>);
  await screen.findByRole("heading", { name: "이미 팀 배정이 완료되었습니다." });
  expect(screen.queryByRole("button", { name: "지원서 작성하기" })).toBeNull();
  expect(screen.queryByRole("button", { name: "최종 제출하기" })).toBeNull();
  expect(teamBuildApi.getApplyProjects).not.toHaveBeenCalled();
  expect(teamBuildApi.submitApply).not.toHaveBeenCalled();
});

test("배정 여부로 1차 지원 화면을 차단하지 않는다", async () => {
  teamBuildApi.getApplyStatus.mockResolvedValue({ hasApplied: false, assigned: true });
  await renderApplyPage(1);
  expect(teamBuildApi.getApplyProjects).toHaveBeenCalledTimes(1);
});
