import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import RecruitmentPositionInput, { recruitmentPositionsError } from "./RecruitmentPositionInput";

test("기존 직무만 선택할 수 있고 이미 선택한 직무는 비활성화한다", () => {
  const onChange = jest.fn();
  render(<RecruitmentPositionInput positions={[
    { role: "백엔드", count: 2 }, { role: "", count: 1 },
  ]} onChange={onChange} />);
  const select = screen.getByRole("combobox", { name: "직무 2" });
  expect(within(select).getAllByRole("option").map((option) => option.value))
    .toEqual(["", "FRONTEND", "BACKEND", "DESIGN", "AI", "APP", "EMBEDDED", "GAME"]);
  expect(within(select).getByRole("option", { name: "백엔드" }).disabled).toBe(true);
  fireEvent.change(select, { target: { value: "FRONTEND" } });
  expect(onChange).toHaveBeenCalledWith([
    { role: "백엔드", count: 2 }, { role: "프론트엔드", count: 1 },
  ]);
});

test("존재하지 않는 직무와 같은 직무의 별칭 중복을 거절한다", () => {
  expect(recruitmentPositionsError([{ role: "없는직무", count: 1 }]))
    .toBe("존재하는 모집 직무를 선택해 주세요.");
  expect(recruitmentPositionsError([
    { role: "BACKEND", count: 1 }, { role: "백엔드", count: 2 },
  ])).toBe("모집 직무가 중복되었습니다.");
});

test.each(["DESIGNER", "디자인", "하드웨어", " backend "])(
  "기존 직무 별칭 %s를 선택값으로 표시한다", (role) => {
    render(<RecruitmentPositionInput positions={[{ role, count: 1 }]} onChange={jest.fn()} />);
    expect(screen.getByRole("combobox", { name: "직무 1" }).value).not.toBe("");
    expect(recruitmentPositionsError([{ role, count: 1 }])).toBe("");
  },
);
