import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import ManageThirdTeamBuildPage from "./ManageThirdTeamBuildPage";

const getUnassigned = () => screen.getByRole("region", { name: "미배정 멤버" });
const getTeam = (name) => screen.getByRole("article", { name });
const dragMember = (name) => {
  const data = {};
  const dataTransfer = {
    setData: (type, value) => {
      data[type] = value;
    },
    getData: (type) => data[type] || "",
  };
  fireEvent.dragStart(within(getUnassigned()).getByRole("button", { name }), {
    dataTransfer,
  });
  return dataTransfer;
};

test("드롭한 멤버를 주요 직무로 배정하고 미배정 목록에서 제거한다", () => {
  render(<ManageThirdTeamBuildPage />);
  const dataTransfer = dragMember(/김다은/);
  fireEvent.dragOver(getTeam("오늘의 기록"), { dataTransfer });
  fireEvent.drop(getTeam("오늘의 기록"), { dataTransfer });

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

  fireEvent.drop(getTeam("WAPs"), { dataTransfer });
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

test("드래그 취소와 외부 드롭으로는 배정하지 않는다", () => {
  render(<ManageThirdTeamBuildPage />);
  const source = within(getUnassigned()).getByRole("button", {
    name: /김다은/,
  });
  const dataTransfer = dragMember(/김다은/);
  fireEvent.dragEnd(source, { dataTransfer });
  fireEvent.drop(getTeam("오늘의 기록"), { dataTransfer });

  expect(within(getUnassigned()).getAllByRole("button")).toHaveLength(7);
  expect(
    within(getTeam("오늘의 기록")).getByText("아직 배정된 멤버가 없습니다."),
  ).toBeInTheDocument();
});
