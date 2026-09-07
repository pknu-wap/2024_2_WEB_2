import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import ManageThirdTeamBuildPage from "./ManageThirdTeamBuildPage";

const getUnassigned = () => screen.getByRole("region", { name: "미배정 멤버" });
const getTeam = (name) => screen.getByRole("article", { name });
const originalPointerEvent = window.PointerEvent;
const originalElementFromPoint = document.elementFromPoint;
beforeAll(() => {
  window.PointerEvent = MouseEvent;
  HTMLElement.prototype.setPointerCapture = jest.fn();
});
afterAll(() => {
  window.PointerEvent = originalPointerEvent;
  document.elementFromPoint = originalElementFromPoint;
  delete HTMLElement.prototype.setPointerCapture;
});

const startDrag = () => {
  const source = within(getUnassigned()).getByRole("button", {
    name: /김다은/,
  });
  fireEvent.pointerDown(source, { button: 0, clientX: 10, clientY: 10 });
  document.elementFromPoint = jest.fn(() =>
    getTeam("오늘의 기록").querySelector("h2"),
  );
  fireEvent.pointerMove(source, { clientX: 100, clientY: 200 });
  return source;
};

test("포인터를 움직여 카드 내부에 놓으면 주요 직무로 한 번만 배정한다", () => {
  render(<ManageThirdTeamBuildPage />);
  const source = startDrag();
  fireEvent.pointerUp(source, { clientX: 100, clientY: 200 });
  const team = within(getTeam("오늘의 기록"));
  expect(
    team.getByRole("row", { name: "FRONTEND 김다은" }),
  ).toBeInTheDocument();
  expect(team.getByText("배정 완료 1명")).toBeInTheDocument();
  expect(
    within(getUnassigned()).queryByRole("button", { name: /김다은/ }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent(
    "김다은 님을 오늘의 기록 팀에 FRONTEND 직무로 배정했습니다.",
  );
  expect(within(getTeam("WAPs")).queryByText("김다은")).not.toBeInTheDocument();
});

test("클릭으로 선택한 멤버를 기존 팀에 추가한다", () => {
  render(<ManageThirdTeamBuildPage />);
  fireEvent.click(
    within(getUnassigned()).getByRole("button", { name: /이준호/ }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "이준호 님을 WAPs에 배정" }),
  );

  const team = within(getTeam("WAPs"));
  expect(team.getByRole("row", { name: "BACKEND 이준호" })).toBeInTheDocument();
  expect(team.getByText("배정 완료 5명")).toBeInTheDocument();
  expect(team.getByText("김민준")).toBeInTheDocument();
  expect(within(getUnassigned()).getAllByRole("button")).toHaveLength(6);
});

test.each(["cancel", "outside", "escape"])(
  "드래그 취소(%s)는 배정하지 않는다",
  (mode) => {
    render(<ManageThirdTeamBuildPage />);
    const source = startDrag();
    if (mode === "cancel") fireEvent.pointerCancel(source);
    if (mode === "escape") fireEvent.keyDown(source, { key: "Escape" });
    if (mode === "outside") document.elementFromPoint = jest.fn(() => null);
    fireEvent.pointerUp(source, { clientX: 100, clientY: 200 });
    expect(within(getUnassigned()).getAllByRole("button")).toHaveLength(7);
    expect(
      within(getTeam("오늘의 기록")).getByText("아직 배정된 멤버가 없습니다."),
    ).toBeInTheDocument();
  },
);
