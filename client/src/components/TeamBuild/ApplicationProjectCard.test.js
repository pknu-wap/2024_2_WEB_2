import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ApplicationProjectCard from "./ApplicationProjectCard";

const project = {
  projectId: 1,
  title: "웹 프로젝트",
  summary: "팀 소개",
  projectType: "WEB",
  recruitPositions: ["BACKEND", "FRONTEND"],
  recruitCount: 2,
  requirements: "주 1회 모임",
};

test.each([false, true])(
  "2차 여부 %s에 따라 모집 조건 표시를 유지한다",
  (isSecondRound) => {
    render(
      <ApplicationProjectCard
        project={project}
        applications={[]}
        teamLabel="WEB 1"
        isSecondRound={isSecondRound}
        isAtApplicationLimit={false}
        onOpenApplication={jest.fn()}
      />,
    );
    expect(screen.getByText("WEB 1")).toBeTruthy();
    expect(Boolean(screen.queryByText("모집인원 : 2명"))).toBe(isSecondRound);
    expect(Boolean(screen.queryByText("주 1회 모임"))).toBe(isSecondRound);
  },
);

test("지원서 한도에 도달해도 기존 지원서는 수정할 수 있다", () => {
  const application = {
    id: "application-1",
    projectId: 1,
    position: "BACKEND",
  };
  const onOpenApplication = jest.fn();
  render(
    <ApplicationProjectCard
      project={project}
      applications={[application]}
      teamLabel="WEB 1"
      isSecondRound={false}
      isAtApplicationLimit
      onOpenApplication={onOpenApplication}
    />,
  );
  const addButton = screen.getByRole("button", {
    name: "+ 지원서 추가 작성하기",
  });
  expect(addButton.disabled).toBe(true);
  fireEvent.click(addButton);
  expect(onOpenApplication).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "지원서 수정하기 (백엔드)" }),
  );
  expect(onOpenApplication).toHaveBeenCalledWith(project, application);
});

test("첫 지원은 프로젝트만 전달하고 미등록 모집 조건을 표시한다", () => {
  const onOpenApplication = jest.fn();
  const withoutRequirements = {
    ...project,
    requirements: "",
    recruitCount: undefined,
  };
  render(
    <ApplicationProjectCard
      project={withoutRequirements}
      applications={[]}
      teamLabel="WEB 1"
      isSecondRound
      isAtApplicationLimit={false}
      onOpenApplication={onOpenApplication}
    />,
  );
  expect(screen.getByText("등록된 요청 조건이 없습니다.")).toBeTruthy();
  expect(screen.getByText("모집인원 : 0명")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "지원서 작성하기" }));
  expect(onOpenApplication).toHaveBeenCalledWith(withoutRequirements);
});
