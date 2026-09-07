import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import ManageThirdTeamBuildPage from "./ManageThirdTeamBuildPage";

const getUnassigned = () => screen.getByRole("region", { name: "미배정 멤버" });
const getTeam = (name) => screen.getByRole("article", { name });
const getAssignedFrontend = () =>
  screen
    .getAllByRole("article")
    .flatMap((team) =>
      within(team).queryAllByRole("button", { name: "FRONTEND" }),
    );
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
  const source = within(getUnassigned()).getAllByRole("button", {
    name: "FRONTEND",
  })[0];
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
  expect(team.getByRole("row", { name: "FRONTEND" })).toBeInTheDocument();
  expect(team.getByText("배정 완료 1명")).toBeInTheDocument();
  expect(
    within(getUnassigned()).getAllByRole("button", { name: "FRONTEND" }),
  ).toHaveLength(2);
  expect(screen.getByRole("status")).toHaveTextContent(
    "오늘의 기록 팀에 FRONTEND 인원 1명을 배치했습니다.",
  );
  expect(screen.queryByText(/김다은/)).not.toBeInTheDocument();
});

test("클릭으로 선택한 멤버를 기존 팀에 추가한다", () => {
  render(<ManageThirdTeamBuildPage />);
  fireEvent.click(
    within(getUnassigned()).getByRole("button", { name: "BACKEND" }),
  );
  expect(screen.queryByText(/이준호/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "WAPs" }));

  const team = within(getTeam("WAPs"));
  expect(team.getByRole("row", { name: "BACKEND" })).toBeInTheDocument();
  expect(team.getByText("배정 완료 5명")).toBeInTheDocument();
  expect(team.getByText("김민준")).toBeInTheDocument();
  expect(within(getUnassigned()).getAllByRole("button")).toHaveLength(8);
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
    expect(within(getUnassigned()).getAllByRole("button")).toHaveLength(9);
    expect(
      within(getTeam("오늘의 기록")).getByText("아직 배정된 멤버가 없습니다."),
    ).toBeInTheDocument();
  },
);

test.each(["Enter", " "])(
  "선택한 멤버를 팀 카드에서 %s 키로 배정한다",
  (key) => {
    render(<ManageThirdTeamBuildPage />);
    fireEvent.click(
      within(getUnassigned()).getByRole("button", { name: "BACKEND" }),
    );
    fireEvent.keyDown(screen.getByRole("button", { name: "오늘의 기록" }), {
      key,
    });
    expect(
      within(getTeam("오늘의 기록")).getByRole("row", {
        name: "BACKEND",
      }),
    ).toBeInTheDocument();
  },
);

test("멤버 선택 없이 팀을 클릭하거나 선택을 취소하면 배정하지 않는다", () => {
  render(<ManageThirdTeamBuildPage />);
  fireEvent.click(getTeam("WAPs"));
  fireEvent.click(
    within(getUnassigned()).getByRole("button", { name: "BACKEND" }),
  );
  fireEvent.keyDown(screen.getByRole("button", { name: "WAPs" }), {
    key: "Escape",
  });
  fireEvent.click(getTeam("WAPs"));
  expect(within(getUnassigned()).getAllByRole("button")).toHaveLength(9);
  expect(
    within(getTeam("WAPs")).getByText("배정 완료 4명"),
  ).toBeInTheDocument();
});

const placeFrontend = () => {
  fireEvent.click(
    within(getUnassigned()).getAllByRole("button", { name: "FRONTEND" })[0],
  );
  fireEvent.click(screen.getByRole("button", { name: "오늘의 기록" }));
};

test("배치한 직무 인원을 클릭으로 여러 팀 사이에 이동한다", () => {
  render(<ManageThirdTeamBuildPage />);
  placeFrontend();
  for (const target of ["WAPs", "캠퍼스 메이트", "오늘의 기록"]) {
    fireEvent.click(getAssignedFrontend()[0]);
    fireEvent.click(screen.getByRole("button", { name: target }));
    expect(
      within(getTeam(target)).getByRole("button", { name: "FRONTEND" }),
    ).toBeInTheDocument();
    expect(getAssignedFrontend()).toHaveLength(1);
  }
  expect(within(getUnassigned()).getAllByRole("button")).toHaveLength(8);
  expect(
    within(getTeam("WAPs")).getByText("배정 완료 4명"),
  ).toBeInTheDocument();
  expect(
    within(getTeam("캠퍼스 메이트")).getByText("배정 완료 3명"),
  ).toBeInTheDocument();
});

test("배치한 직무 인원을 드래그하면 원래 팀에서 제거하고 새 팀에 추가한다", () => {
  render(<ManageThirdTeamBuildPage />);
  placeFrontend();
  const source = getAssignedFrontend()[0];
  fireEvent.pointerDown(source, { button: 0, clientX: 10, clientY: 10 });
  document.elementFromPoint = jest.fn(() => getTeam("WAPs"));
  fireEvent.pointerMove(source, { clientX: 100, clientY: 200 });
  fireEvent.pointerUp(source, { clientX: 100, clientY: 200 });
  expect(
    within(getTeam("WAPs")).getByRole("button", { name: "FRONTEND" }),
  ).toBeInTheDocument();
  expect(
    within(getTeam("오늘의 기록")).getByText("배정 완료 0명"),
  ).toBeInTheDocument();
  expect(within(getUnassigned()).getAllByRole("button")).toHaveLength(8);
  expect(screen.getByRole("status")).toHaveTextContent(
    "오늘의 기록 팀에서 WAPs 팀으로 이동했습니다.",
  );
});

test.each(["same", "cancel", "outside"])(
  "같은 팀 또는 취소된 이동(%s)은 원래 배치를 유지한다",
  (mode) => {
    render(<ManageThirdTeamBuildPage />);
    placeFrontend();
    const source = getAssignedFrontend()[0];
    fireEvent.pointerDown(source, { button: 0, clientX: 10, clientY: 10 });
    document.elementFromPoint = jest.fn(() =>
      mode === "outside" ? null : getTeam("오늘의 기록"),
    );
    fireEvent.pointerMove(source, { clientX: 100, clientY: 200 });
    if (mode === "cancel") fireEvent.pointerCancel(source);
    fireEvent.pointerUp(source, { clientX: 100, clientY: 200 });
    expect(
      within(getTeam("오늘의 기록")).getByText("배정 완료 1명"),
    ).toBeInTheDocument();
    expect(getAssignedFrontend()).toHaveLength(1);
  },
);

const createTeam = () =>
  fireEvent.click(screen.getByRole("button", { name: "팀 생성" }));

test("팀을 생성하면 빈 카드가 추가되고 기존 명단과 미배정 인원은 유지된다", () => {
  render(<ManageThirdTeamBuildPage />);
  createTeam();
  expect(screen.getAllByRole("article")).toHaveLength(7);
  expect(
    within(getTeam("팀 A")).getByText("배정 완료 0명"),
  ).toBeInTheDocument();
  expect(
    within(getTeam("팀 A")).getByText("아직 배정된 멤버가 없습니다."),
  ).toBeInTheDocument();
  expect(within(getTeam("WAPs")).getByText("김민준")).toBeInTheDocument();
  expect(within(getUnassigned()).getAllByRole("button")).toHaveLength(9);
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
});

test("버튼을 누를 때마다 팀 이름이 알파벳 순서대로 증가한다", () => {
  render(<ManageThirdTeamBuildPage />);
  createTeam();
  createTeam();
  createTeam();
  for (const name of ["팀 A", "팀 B", "팀 C"]) {
    expect(
      within(getTeam(name)).getByText("배정 완료 0명"),
    ).toBeInTheDocument();
  }
  expect(screen.getAllByRole("article")).toHaveLength(9);
});

test("연속 생성한 팀에 직무를 배치하고 새 팀끼리 이동할 수 있다", () => {
  render(<ManageThirdTeamBuildPage />);
  createTeam();
  createTeam();
  fireEvent.click(
    within(getUnassigned()).getAllByRole("button", { name: "FRONTEND" })[0],
  );
  fireEvent.click(screen.getByRole("button", { name: "팀 A" }));
  const source = within(getTeam("팀 A")).getByRole("button", {
    name: "FRONTEND",
  });
  fireEvent.pointerDown(source, { button: 0, clientX: 10, clientY: 10 });
  document.elementFromPoint = jest.fn(() => getTeam("팀 B"));
  fireEvent.pointerMove(source, { clientX: 100, clientY: 200 });
  fireEvent.pointerUp(source, { clientX: 100, clientY: 200 });
  expect(
    within(getTeam("팀 A")).getByText("배정 완료 0명"),
  ).toBeInTheDocument();
  expect(
    within(getTeam("팀 B")).getByRole("button", { name: "FRONTEND" }),
  ).toBeInTheDocument();
  expect(screen.getAllByRole("article")).toHaveLength(8);
});
