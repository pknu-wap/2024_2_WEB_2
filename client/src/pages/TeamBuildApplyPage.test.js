import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TeamBuildApplyPage from "./TeamBuildApplyPage";

jest.mock("js-cookie", () => ({ get: () => "test-token" }));
jest.mock("../api/team-build", () => ({
  teamBuildApi: {
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
  "%i차 경력 자동 입력과 개별 수정, 자기소개 120자 제한",
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
      return within(screen.getByRole("dialog"));
    };
    let form = open();
    fireEvent.change(form.getByLabelText("지원 직무"), {
      target: { value: "BACKEND" },
    });
    fireEvent.change(form.getByLabelText("경력"), {
      target: { value: "웹 개발 경험" },
    });
    fireEvent.change(form.getByLabelText("간단 자기소개 및 PR 메시지"), {
      target: { value: "가".repeat(121) },
    });
    expect(
      form.getByLabelText("간단 자기소개 및 PR 메시지").value,
    ).toHaveLength(120);
    fireEvent.click(form.getByRole("button", { name: "지원서 저장하기" }));
    form = open();
    expect(form.getByLabelText("경력").value).toBe("웹 개발 경험");
    fireEvent.change(form.getByLabelText("지원 직무"), {
      target: { value: "APP" },
    });
    fireEvent.change(form.getByLabelText("경력"), {
      target: { value: "앱 개발 경험" },
    });
    fireEvent.change(form.getByLabelText("간단 자기소개 및 PR 메시지"), {
      target: { value: "함께하고 싶습니다" },
    });
    fireEvent.click(form.getByRole("button", { name: "지원서 저장하기" }));
    fireEvent.click(
      screen.getByRole("button", { name: "지원서 수정하기 (백엔드)" }),
    );
    form = within(screen.getByRole("dialog"));
    expect(form.getByLabelText("경력").value).toBe("웹 개발 경험");
    fireEvent.click(form.getByRole("button", { name: "지원서 닫기" }));
    form = open();
    expect(form.getByLabelText("경력").value).toBe("앱 개발 경험");
  },
);

test("단계 전환 시 프로젝트 목록과 우선순위 화면이 올바르게 렌더링된다", async () => {
  render(
    <MemoryRouter>
      <TeamBuildApplyPage />
    </MemoryRouter>,
  );
  await screen.findAllByRole("button", { name: "지원서 작성하기" });
  fireEvent.change(screen.getByLabelText("지원 직무"), {
    target: { value: "BACKEND" },
  });
  fireEvent.change(screen.getByLabelText("자기소개 및 PR 메시지"), {
    target: { value: "백엔드 개발 경험" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "지원서 저장하고 다음으로" }),
  );
  fireEvent.click(screen.getAllByRole("button", { name: "프로젝트 선택" })[0]);
  fireEvent.click(
    screen.getByRole("button", { name: "우선순위 설정하고 제출하기" }),
  );
  const steps = within(screen.getByRole("region", { name: "지원 단계" }));
  expect(steps.getByText("지원 우선순위 설정")).toBeTruthy();
  expect(
    steps.getByRole("button", { name: "선택한 프로젝트에 지원하기" }),
  ).toBeTruthy();
  expect(screen.queryByRole("alertdialog")).toBeNull();
  fireEvent.click(steps.getAllByRole("button", { name: "수정" })[1]);
  expect(steps.getByRole("button", { name: "전체 삭제" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "선택됨" }).disabled).toBe(true);
});
