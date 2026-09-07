import { act, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import ManageThirdTeamBuildPage from "./ManageThirdTeamBuildPage";
import { thirdRoundApi } from "../../api/third-round";
import {
  thirdRoundTeams,
  thirdRoundPositionSlots,
} from "../../mocks/thirdRoundTeams";

jest.mock("../../api/third-round", () => ({
  thirdRoundApi: {
    open: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    shuffle: jest.fn(),
    complete: jest.fn(),
    move: jest.fn(),
    delete: jest.fn(),
  },
}));
let savedBoard;
let nextTeamNumber;
const snapshot = () => JSON.parse(JSON.stringify(savedBoard));
const settle = async () => {
  await act(async () => {});
};

beforeEach(() => {
  jest.resetAllMocks();
  nextTeamNumber = 0;
  savedBoard = {
    semester: "2026-2",
    revision: 0,
    teams: thirdRoundTeams.map((team) => ({
      ...team,
      id: team.projectId,
      isCreated: false,
      members: [...team.members],
    })),
    unassigned: [...thirdRoundPositionSlots],
  };
  thirdRoundApi.open.mockImplementation(async () => snapshot());
  thirdRoundApi.get.mockImplementation(async () => snapshot());
  thirdRoundApi.create.mockImplementation(async () => {
    savedBoard.teams.push({
      id: 100 + nextTeamNumber,
      projectId: null,
      teamName: `팀 ${String.fromCharCode(65 + nextTeamNumber++)}`,
      isCreated: true,
      members: [],
    });
    savedBoard.revision++;
    return snapshot();
  });
  thirdRoundApi.move.mockImplementation(async (id, teamId) => {
    const member = [
      ...savedBoard.unassigned,
      ...savedBoard.teams.flatMap((team) => team.members),
    ].find((m) => m.id === id);
    savedBoard.unassigned = savedBoard.unassigned.filter((m) => m.id !== id);
    savedBoard.teams.forEach((team) => {
      team.members = team.members.filter((m) => m.id !== id);
    });
    if (teamId === null) savedBoard.unassigned.push(member);
    else
      savedBoard.teams.find((team) => team.id === teamId).members.push(member);
    savedBoard.revision++;
    return snapshot();
  });
  thirdRoundApi.delete.mockImplementation(async (id) => {
    savedBoard.unassigned.push(
      ...savedBoard.teams.find((team) => team.id === id).members,
    );
    savedBoard.teams = savedBoard.teams.filter((team) => team.id !== id);
    savedBoard.revision++;
    return snapshot();
  });
});

const getUnassigned = () =>
  screen.getByLabelText("미배정 멤버", { selector: "section" });
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

const startDrag = async () => {
  const source = within(getUnassigned()).getAllByRole("button", {
    name: "FRONTEND",
  })[0];
  fireEvent.pointerDown(source, { button: 0, clientX: 10, clientY: 10 });
  await settle();
  document.elementFromPoint = jest.fn(() =>
    getTeam("오늘의 기록").querySelector("h2"),
  );
  fireEvent.pointerMove(source, { clientX: 100, clientY: 200 });
  await settle();
  return source;
};

test("셔플은 중복 요청을 막고 저장 응답의 이름 배치를 반영하며 재방문 시 유지한다", async () => {
  const first = { ...savedBoard.unassigned.shift(), name: "김다은" };
  const second = { ...savedBoard.unassigned.shift(), name: "이준호" };
  savedBoard.teams[0].members.push(first);
  savedBoard.teams[1].members.push(second);
  const firstTeamName = savedBoard.teams[0].teamName;
  const secondTeamName = savedBoard.teams[1].teamName;
  let resolve;
  thirdRoundApi.shuffle.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const page = render(<ManageThirdTeamBuildPage />);
  await settle();
  const button = screen.getByRole("button", { name: "셔플" });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(thirdRoundApi.shuffle).toHaveBeenCalledTimes(1);
  expect(thirdRoundApi.shuffle).toHaveBeenCalledWith(0);
  expect(button).toBeDisabled();
  expect(
    within(getTeam(firstTeamName)).getByText("김다은(FRONTEND)"),
  ).toBeInTheDocument();
  savedBoard.teams[0].members.pop();
  savedBoard.teams[1].members.pop();
  savedBoard.teams[0].members.push(second);
  savedBoard.teams[1].members.push(first);
  savedBoard.revision++;
  await act(async () => resolve(snapshot()));
  expect(button).toBeEnabled();
  expect(
    within(getTeam(firstTeamName)).getByText("이준호(FRONTEND)"),
  ).toBeInTheDocument();
  expect(
    within(getTeam(secondTeamName)).getByText("김다은(FRONTEND)"),
  ).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("셔플하고 저장했습니다");
  page.unmount();
  render(<ManageThirdTeamBuildPage />);
  await settle();
  expect(
    within(getTeam(firstTeamName)).getByText("이준호(FRONTEND)"),
  ).toBeInTheDocument();
  thirdRoundApi.shuffle.mockResolvedValueOnce(snapshot());
  fireEvent.click(screen.getByRole("button", { name: "셔플" }));
  await settle();
  expect(thirdRoundApi.shuffle).toHaveBeenLastCalledWith(1);
});

test("셔플 저장 실패 시 기존 배치와 이름을 유지한다", async () => {
  savedBoard.unassigned[0] = { ...savedBoard.unassigned[0], name: "김다은" };
  thirdRoundApi.shuffle.mockRejectedValueOnce(new Error("network"));
  render(<ManageThirdTeamBuildPage />);
  await settle();
  fireEvent.click(screen.getByRole("button", { name: "셔플" }));
  await settle();
  expect(
    within(getUnassigned()).getByText("김다은(FRONTEND)"),
  ).toBeInTheDocument();
  expect(within(getUnassigned()).getAllByRole("button")).toHaveLength(9);
  expect(screen.getByRole("alert")).toHaveTextContent("저장하지 못했습니다");
});

test("미배정 지원자의 이름과 직무를 표시하고 이동 및 재조회 후에도 유지한다", async () => {
  savedBoard.unassigned[0] = { ...savedBoard.unassigned[0], name: "김다은" };
  const page = render(<ManageThirdTeamBuildPage />);
  await settle();
  const source = within(getUnassigned()).getByRole("button", {
    name: "김다은(FRONTEND)",
  });
  fireEvent.pointerDown(source, { button: 0, clientX: 10, clientY: 10 });
  document.elementFromPoint = jest.fn(() => getTeam("오늘의 기록"));
  fireEvent.pointerMove(source, { clientX: 100, clientY: 200 });
  expect(screen.getAllByText("김다은(FRONTEND)")).toHaveLength(2);
  fireEvent.pointerUp(source, { clientX: 100, clientY: 200 });
  await settle();
  expect(
    within(getUnassigned()).queryByText("김다은(FRONTEND)"),
  ).not.toBeInTheDocument();
  page.unmount();
  render(<ManageThirdTeamBuildPage />);
  await settle();
  expect(
    within(getTeam("오늘의 기록")).getByRole("button", {
      name: "김다은(FRONTEND)",
    }),
  ).toBeInTheDocument();
});

test("포인터를 움직여 카드 내부에 놓으면 주요 직무로 한 번만 배정한다", async () => {
  render(<ManageThirdTeamBuildPage />);
  await settle();
  const source = await startDrag();
  fireEvent.pointerUp(source, { clientX: 100, clientY: 200 });
  await settle();
  const team = within(getTeam("오늘의 기록"));
  expect(team.getByRole("row", { name: "FRONTEND" })).toBeInTheDocument();
  expect(team.queryAllByRole("row").slice(1)).toHaveLength(1);
  expect(
    within(getUnassigned()).getAllByRole("button", { name: "FRONTEND" }),
  ).toHaveLength(2);
  expect(screen.getByRole("status")).toHaveTextContent(
    "오늘의 기록 팀에 FRONTEND 인원 1명을 배치했습니다.",
  );
  expect(screen.queryByText(/김다은/)).not.toBeInTheDocument();
});

test("클릭으로 선택한 멤버를 기존 팀에 추가한다", async () => {
  render(<ManageThirdTeamBuildPage />);
  await settle();
  fireEvent.click(
    within(getUnassigned()).getByRole("button", { name: "BACKEND" }),
  );
  await settle();
  expect(screen.queryByText(/이준호/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "WAPs" }));
  await settle();

  const team = within(getTeam("WAPs"));
  expect(team.getByRole("row", { name: "BACKEND" })).toBeInTheDocument();
  expect(team.queryAllByRole("row").slice(1)).toHaveLength(5);
  expect(team.getByText("김민준")).toBeInTheDocument();
  expect(within(getUnassigned()).getAllByRole("button")).toHaveLength(8);
});

test.each(["cancel", "outside", "escape"])(
  "드래그 취소(%s)는 배정하지 않는다",
  async (mode) => {
    render(<ManageThirdTeamBuildPage />);
    await settle();
    const source = await startDrag();
    if (mode === "cancel") fireEvent.pointerCancel(source);
    await settle();
    if (mode === "escape") fireEvent.keyDown(source, { key: "Escape" });
    await settle();
    if (mode === "outside") document.elementFromPoint = jest.fn(() => null);
    fireEvent.pointerUp(source, { clientX: 100, clientY: 200 });
    await settle();
    expect(within(getUnassigned()).getAllByRole("button")).toHaveLength(9);
    expect(
      within(getTeam("오늘의 기록")).getByText("아직 배정된 멤버가 없습니다."),
    ).toBeInTheDocument();
  },
);

test.each(["Enter", " "])(
  "선택한 멤버를 팀 카드에서 %s 키로 배정한다",
  async (key) => {
    render(<ManageThirdTeamBuildPage />);
    await settle();
    fireEvent.click(
      within(getUnassigned()).getByRole("button", { name: "BACKEND" }),
    );
    await settle();
    fireEvent.keyDown(screen.getByRole("button", { name: "오늘의 기록" }), {
      key,
    });
    await settle();
    expect(
      within(getTeam("오늘의 기록")).getByRole("row", {
        name: "BACKEND",
      }),
    ).toBeInTheDocument();
  },
);

test("멤버 선택 없이 팀을 클릭하거나 선택을 취소하면 배정하지 않는다", async () => {
  render(<ManageThirdTeamBuildPage />);
  await settle();
  fireEvent.click(getTeam("WAPs"));
  await settle();
  fireEvent.click(
    within(getUnassigned()).getByRole("button", { name: "BACKEND" }),
  );
  await settle();
  fireEvent.keyDown(screen.getByRole("button", { name: "WAPs" }), {
    key: "Escape",
  });
  await settle();
  fireEvent.click(getTeam("WAPs"));
  await settle();
  expect(within(getUnassigned()).getAllByRole("button")).toHaveLength(9);
  expect(within(getTeam("WAPs")).queryAllByRole("row").slice(1)).toHaveLength(
    4,
  );
});

const placeFrontend = async () => {
  fireEvent.click(
    within(getUnassigned()).getAllByRole("button", { name: "FRONTEND" })[0],
  );
  await settle();
  fireEvent.click(screen.getByRole("button", { name: "오늘의 기록" }));
  await settle();
};

test("배치한 직무 인원을 클릭으로 여러 팀 사이에 이동한다", async () => {
  render(<ManageThirdTeamBuildPage />);
  await settle();
  await placeFrontend();
  for (const target of ["WAPs", "캠퍼스 메이트", "오늘의 기록"]) {
    fireEvent.click(getAssignedFrontend()[0]);
    await settle();
    fireEvent.click(screen.getByRole("button", { name: target }));
    await settle();
    expect(
      within(getTeam(target)).getByRole("button", { name: "FRONTEND" }),
    ).toBeInTheDocument();
    expect(getAssignedFrontend()).toHaveLength(1);
  }
  expect(within(getUnassigned()).getAllByRole("button")).toHaveLength(8);
  expect(within(getTeam("WAPs")).queryAllByRole("row").slice(1)).toHaveLength(
    4,
  );
  expect(
    within(getTeam("캠퍼스 메이트")).queryAllByRole("row").slice(1),
  ).toHaveLength(3);
});

test("배치한 직무 인원을 드래그하면 원래 팀에서 제거하고 새 팀에 추가한다", async () => {
  render(<ManageThirdTeamBuildPage />);
  await settle();
  await placeFrontend();
  const source = getAssignedFrontend()[0];
  fireEvent.pointerDown(source, { button: 0, clientX: 10, clientY: 10 });
  await settle();
  document.elementFromPoint = jest.fn(() => getTeam("WAPs"));
  fireEvent.pointerMove(source, { clientX: 100, clientY: 200 });
  await settle();
  fireEvent.pointerUp(source, { clientX: 100, clientY: 200 });
  await settle();
  expect(
    within(getTeam("WAPs")).getByRole("button", { name: "FRONTEND" }),
  ).toBeInTheDocument();
  expect(
    within(getTeam("오늘의 기록")).queryAllByRole("row").slice(1),
  ).toHaveLength(0);
  expect(within(getUnassigned()).getAllByRole("button")).toHaveLength(8);
  expect(screen.getByRole("status")).toHaveTextContent(
    "오늘의 기록 팀에서 WAPs 팀으로 이동했습니다.",
  );
});

test.each(["same", "cancel", "outside"])(
  "같은 팀 또는 취소된 이동(%s)은 원래 배치를 유지한다",
  async (mode) => {
    render(<ManageThirdTeamBuildPage />);
    await settle();
    await placeFrontend();
    const source = getAssignedFrontend()[0];
    fireEvent.pointerDown(source, { button: 0, clientX: 10, clientY: 10 });
    await settle();
    document.elementFromPoint = jest.fn(() =>
      mode === "outside" ? null : getTeam("오늘의 기록"),
    );
    fireEvent.pointerMove(source, { clientX: 100, clientY: 200 });
    await settle();
    if (mode === "cancel") fireEvent.pointerCancel(source);
    await settle();
    fireEvent.pointerUp(source, { clientX: 100, clientY: 200 });
    await settle();
    expect(
      within(getTeam("오늘의 기록")).queryAllByRole("row").slice(1),
    ).toHaveLength(1);
    expect(getAssignedFrontend()).toHaveLength(1);
  },
);

const createTeam = async () => {
  fireEvent.click(screen.getByRole("button", { name: "팀 생성" }));
  await settle();
  await settle();
};

test("팀을 생성하면 빈 카드가 추가되고 기존 명단과 미배정 인원은 유지된다", async () => {
  render(<ManageThirdTeamBuildPage />);
  await settle();
  await createTeam();
  expect(screen.getAllByRole("article")).toHaveLength(7);
  expect(within(getTeam("팀 A")).queryAllByRole("row").slice(1)).toHaveLength(
    0,
  );
  expect(
    within(getTeam("팀 A")).getByText("아직 배정된 멤버가 없습니다."),
  ).toBeInTheDocument();
  expect(within(getTeam("WAPs")).getByText("김민준")).toBeInTheDocument();
  expect(within(getUnassigned()).getAllByRole("button")).toHaveLength(9);
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
});

test("버튼을 누를 때마다 팀 이름이 알파벳 순서대로 증가한다", async () => {
  render(<ManageThirdTeamBuildPage />);
  await settle();
  await createTeam();
  await createTeam();
  await createTeam();
  for (const name of ["팀 A", "팀 B", "팀 C"]) {
    expect(within(getTeam(name)).queryAllByRole("row").slice(1)).toHaveLength(
      0,
    );
  }
  expect(screen.getAllByRole("article")).toHaveLength(9);
});

test("연속 생성한 팀에 직무를 배치하고 새 팀끼리 이동할 수 있다", async () => {
  render(<ManageThirdTeamBuildPage />);
  await settle();
  await createTeam();
  await createTeam();
  fireEvent.click(
    within(getUnassigned()).getAllByRole("button", { name: "FRONTEND" })[0],
  );
  await settle();
  fireEvent.click(screen.getByRole("button", { name: "팀 A" }));
  await settle();
  const source = within(getTeam("팀 A")).getByRole("button", {
    name: "FRONTEND",
  });
  fireEvent.pointerDown(source, { button: 0, clientX: 10, clientY: 10 });
  await settle();
  document.elementFromPoint = jest.fn(() => getTeam("팀 B"));
  fireEvent.pointerMove(source, { clientX: 100, clientY: 200 });
  await settle();
  fireEvent.pointerUp(source, { clientX: 100, clientY: 200 });
  await settle();
  expect(within(getTeam("팀 A")).queryAllByRole("row").slice(1)).toHaveLength(
    0,
  );
  expect(
    within(getTeam("팀 B")).getByRole("button", { name: "FRONTEND" }),
  ).toBeInTheDocument();
  expect(screen.getAllByRole("article")).toHaveLength(8);
});

test("생성한 빈 팀만 삭제할 수 있다", async () => {
  render(<ManageThirdTeamBuildPage />);
  await settle();
  expect(
    screen.queryByRole("button", { name: /삭제/ }),
  ).not.toBeInTheDocument();
  await createTeam();
  await createTeam();
  fireEvent.click(screen.getByRole("button", { name: "팀 A 삭제" }));
  await settle();
  expect(
    screen.queryByRole("article", { name: "팀 A" }),
  ).not.toBeInTheDocument();
  expect(getTeam("팀 B")).toBeInTheDocument();
  expect(getTeam("WAPs")).toBeInTheDocument();
  expect(screen.getAllByRole("article")).toHaveLength(7);
  expect(within(getUnassigned()).getAllByRole("button")).toHaveLength(9);
});

test("직무 인원이 있는 생성 팀을 삭제하면 모두 미배정으로 돌아가고 다시 배치할 수 있다", async () => {
  render(<ManageThirdTeamBuildPage />);
  await settle();
  await createTeam();
  for (let index = 0; index < 2; index += 1) {
    fireEvent.click(
      within(getUnassigned()).getAllByRole("button", { name: "FRONTEND" })[0],
    );
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "팀 A" }));
    await settle();
  }
  fireEvent.click(
    within(getTeam("팀 A")).getAllByRole("button", { name: "FRONTEND" })[0],
  );
  await settle();
  fireEvent.click(screen.getByRole("button", { name: "팀 A 삭제" }));
  await settle();
  expect(
    screen.queryByRole("article", { name: "팀 A" }),
  ).not.toBeInTheDocument();
  expect(
    within(getUnassigned()).getAllByRole("button", { name: "FRONTEND" }),
  ).toHaveLength(3);
  expect(within(getUnassigned()).getAllByRole("button")).toHaveLength(9);
  expect(screen.getByRole("status")).toHaveTextContent(
    "직무 인원 2명을 미배정 목록으로 옮겼습니다.",
  );
  await createTeam();
  fireEvent.click(
    within(getUnassigned()).getAllByRole("button", { name: "FRONTEND" })[1],
  );
  await settle();
  fireEvent.click(screen.getByRole("button", { name: "팀 B" }));
  await settle();
  expect(within(getTeam("팀 B")).queryAllByRole("row").slice(1)).toHaveLength(
    1,
  );
});

test("다시 방문하면 서버에 저장한 팀과 배치안을 복원한다", async () => {
  const page = render(<ManageThirdTeamBuildPage />);
  await settle();
  await createTeam();
  fireEvent.click(
    within(getUnassigned()).getAllByRole("button", { name: "FRONTEND" })[0],
  );
  fireEvent.click(screen.getByRole("button", { name: "팀 A" }));
  await settle();
  page.unmount();
  render(<ManageThirdTeamBuildPage />);
  await settle();
  expect(
    within(getTeam("팀 A")).getByRole("button", { name: "FRONTEND" }),
  ).toBeInTheDocument();
  expect(
    within(getUnassigned()).getAllByRole("button", { name: "FRONTEND" }),
  ).toHaveLength(2);
});

test("저장 중에는 중복 요청을 보내지 않고 응답이 온 뒤에만 화면을 변경한다", async () => {
  let resolve;
  thirdRoundApi.create.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  render(<ManageThirdTeamBuildPage />);
  await settle();
  fireEvent.click(screen.getByRole("button", { name: "팀 생성" }));
  fireEvent.click(screen.getByRole("button", { name: "팀 생성" }));
  expect(thirdRoundApi.create).toHaveBeenCalledTimes(1);
  expect(screen.getAllByRole("article")).toHaveLength(6);
  expect(screen.getByRole("button", { name: "팀 생성" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "셔플" })).toBeDisabled();
  await act(async () => resolve(snapshot()));
  expect(screen.getByRole("button", { name: "팀 생성" })).toBeEnabled();
});

test("저장이 실패하면 기존 배치안을 유지하고 오류를 표시한다", async () => {
  thirdRoundApi.move.mockRejectedValueOnce(new Error("network"));
  render(<ManageThirdTeamBuildPage />);
  await settle();
  await placeFrontend();
  expect(
    within(getTeam("오늘의 기록")).queryAllByRole("row").slice(1),
  ).toHaveLength(0);
  expect(
    within(getUnassigned()).getAllByRole("button", { name: "FRONTEND" }),
  ).toHaveLength(3);
  expect(screen.getByRole("alert")).toHaveTextContent("저장하지 못했습니다");
});

test("동시 수정 충돌은 최신 배치안을 조회하고 재시도에 최신 버전을 사용한다", async () => {
  render(<ManageThirdTeamBuildPage />);
  await settle();
  savedBoard.revision = 4;
  thirdRoundApi.create.mockRejectedValueOnce({
    response: { status: 409, data: { message: "다른 관리자가 변경했습니다." } },
  });
  await createTeam();
  expect(thirdRoundApi.get).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("alert")).toHaveTextContent(
    "다른 관리자가 변경했습니다.",
  );
  await createTeam();
  expect(thirdRoundApi.create).toHaveBeenLastCalledWith(4);
});

test("초기 조회가 실패하면 수정을 막고 새로고침으로 재시도한다", async () => {
  thirdRoundApi.open.mockRejectedValueOnce(new Error("network"));
  render(<ManageThirdTeamBuildPage />);
  await settle();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "배치안을 불러오지 못했습니다.",
  );
  expect(screen.getByRole("button", { name: "팀 생성" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "셔플" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "새로고침" }));
  await settle();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getAllByRole("article")).toHaveLength(6);
});

test.each(["click", "Enter", " ", "drag"])(
  "배치한 지원자를 미배정 섹션으로 돌리고 다시 배치할 수 있다 (%s)",
  async (method) => {
    savedBoard.unassigned = [{ ...savedBoard.unassigned[0], name: "김다은" }];
    const page = render(<ManageThirdTeamBuildPage />);
    await settle();
    fireEvent.click(
      within(getUnassigned()).getByRole("button", { name: "김다은(FRONTEND)" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "오늘의 기록" }));
    await settle();
    expect(
      within(getUnassigned()).getByText("모든 멤버의 배정이 완료되었습니다."),
    ).toBeInTheDocument();
    const source = within(getTeam("오늘의 기록")).getByRole("button", {
      name: "김다은(FRONTEND)",
    });
    if (method === "drag") {
      fireEvent.pointerDown(source, { button: 0, clientX: 10, clientY: 10 });
      document.elementFromPoint = jest.fn(() =>
        getUnassigned().querySelector("h2"),
      );
      fireEvent.pointerMove(source, { clientX: 100, clientY: 200 });
      fireEvent.pointerUp(source, { clientX: 100, clientY: 200 });
    } else {
      fireEvent.click(source);
      const target = screen.getByRole("button", { name: "미배정 멤버" });
      if (method === "click") fireEvent.click(target);
      else fireEvent.keyDown(target, { key: method });
    }
    await settle();
    expect(thirdRoundApi.move).toHaveBeenLastCalledWith(
      savedBoard.unassigned[0].id,
      null,
      1,
    );
    expect(
      within(getTeam("오늘의 기록")).queryAllByRole("row").slice(1),
    ).toHaveLength(0);
    expect(screen.getByRole("status")).toHaveTextContent(
      "김다은(FRONTEND)을 미배정 목록으로 옮겼습니다.",
    );
    page.unmount();
    render(<ManageThirdTeamBuildPage />);
    await settle();
    fireEvent.click(
      within(getUnassigned()).getByRole("button", { name: "김다은(FRONTEND)" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "WAPs" }));
    await settle();
    expect(
      within(getTeam("WAPs")).getByText("김다은(FRONTEND)"),
    ).toBeInTheDocument();
  },
);

test("미배정 복귀 저장이 실패하면 원래 팀에 남는다", async () => {
  render(<ManageThirdTeamBuildPage />);
  await settle();
  await placeFrontend();
  thirdRoundApi.move.mockRejectedValueOnce(new Error("network"));
  fireEvent.click(getAssignedFrontend()[0]);
  fireEvent.click(screen.getByRole("button", { name: "미배정 멤버" }));
  await settle();
  expect(getAssignedFrontend()).toHaveLength(1);
  expect(within(getUnassigned()).getAllByRole("button")).toHaveLength(8);
  expect(screen.getByRole("alert")).toHaveTextContent("저장하지 못했습니다");
});

test("완료 응답 후 편집을 잠그고 재방문해도 완료 상태를 유지한다", async () => {
  let resolve;
  thirdRoundApi.complete.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const page = render(<ManageThirdTeamBuildPage />);
  await settle();
  const button = screen.getByRole("button", { name: "팀 빌딩 완료" });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(thirdRoundApi.complete).toHaveBeenCalledTimes(1);
  expect(thirdRoundApi.complete).toHaveBeenCalledWith(0);
  expect(button).toBeDisabled();
  expect(
    screen.queryByRole("link", { name: "팀빌딩 결과 보기" }),
  ).not.toBeInTheDocument();
  savedBoard.completed = true;
  savedBoard.revision++;
  await act(async () => resolve(snapshot()));
  expect(screen.getByRole("status")).toHaveTextContent(
    "팀빌딩 결과에 반영되었습니다",
  );
  expect(
    screen.getByRole("link", { name: "팀빌딩 결과 보기" }),
  ).toHaveAttribute("href", "/team-build/result");
  page.unmount();
  render(<ManageThirdTeamBuildPage />);
  await settle();
  for (const name of ["팀 빌딩 완료", "셔플", "팀 생성"]) {
    expect(screen.getByRole("button", { name })).toBeDisabled();
  }
  for (const member of within(getUnassigned()).getAllByRole("button"))
    expect(member).toBeDisabled();
});

test("완료 실패 시 편집 가능한 배치안을 유지하고 충돌 후 최신 버전으로 재시도한다", async () => {
  render(<ManageThirdTeamBuildPage />);
  await settle();
  savedBoard.revision = 4;
  thirdRoundApi.complete.mockRejectedValueOnce({
    response: { status: 409, data: { message: "다른 관리자가 변경했습니다." } },
  });
  fireEvent.click(screen.getByRole("button", { name: "팀 빌딩 완료" }));
  await settle();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "다른 관리자가 변경했습니다.",
  );
  expect(screen.getByRole("button", { name: "팀 생성" })).toBeEnabled();
  thirdRoundApi.complete.mockResolvedValueOnce({
    ...snapshot(),
    completed: true,
    revision: 5,
  });
  fireEvent.click(screen.getByRole("button", { name: "팀 빌딩 완료" }));
  await settle();
  expect(thirdRoundApi.complete).toHaveBeenLastCalledWith(4);
  expect(screen.getByRole("button", { name: "팀 생성" })).toBeDisabled();
});

test("팀장은 배치 인원과 별도로 표시하고 팀장이 없으면 문구를 숨긴다", async () => {
  savedBoard.teams[0].leader = { id: 1000, name: "박팀장" };
  render(<ManageThirdTeamBuildPage />);
  await settle();
  const team = within(getTeam(savedBoard.teams[0].teamName));
  expect(team.getByText("팀장: 박팀장")).toBeInTheDocument();
  expect(
    team.queryByRole("button", { name: /박팀장/ }),
  ).not.toBeInTheDocument();
  expect(team.queryAllByRole("row").slice(1)).toHaveLength(4);
  await createTeam();
  expect(within(getTeam("팀 A")).queryByText(/팀장:/)).not.toBeInTheDocument();
});

test("팀 카드에 배정 완료 인원 대신 프로젝트 분야를 표시한다", async () => {
  savedBoard.teams[0].projectType = "WEB";
  render(<ManageThirdTeamBuildPage />);
  await settle();
  const team = within(getTeam(savedBoard.teams[0].teamName));
  expect(team.getByText("WEB")).toBeInTheDocument();
  expect(team.queryByText(/배정 완료/)).not.toBeInTheDocument();
  await createTeam();
  expect(
    within(getTeam("팀 A")).queryByText(/WEB|배정 완료/),
  ).not.toBeInTheDocument();
});
