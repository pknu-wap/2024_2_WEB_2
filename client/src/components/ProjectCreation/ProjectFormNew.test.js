import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { projectApi } from "../../api/project";
import ProjectFormNew from "./ProjectFormNew";

jest.mock("../../api/project", () => ({
  projectApi: {
    getCurrentSemester: jest.fn(),
    createProject: jest.fn(),
    updateProject: jest.fn(),
  },
}));
jest.mock("./ImageUploader", () => () => null);
jest.mock("./TechStackSelector", () => () => null);
jest.mock("./TeamMemberInputForm", () => () => null);
jest.mock("./InputPin", () => ({ password, setPassword }) => (
  <input
    aria-label="비밀번호"
    value={password}
    onChange={(event) => setPassword(event.target.value)}
  />
));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(window, "alert").mockImplementation(() => {});
  projectApi.getCurrentSemester.mockResolvedValue({ semester: "2026-02" });
  projectApi.createProject.mockResolvedValue({});
  projectApi.updateProject.mockResolvedValue({});
});
afterEach(() => jest.restoreAllMocks());

const readProject = (data) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(JSON.parse(reader.result));
    reader.readAsText(data.get("project"));
  });

test("모집 직무를 추가하고 인원을 숫자로 저장한다", async () => {
  render(
    <MemoryRouter>
      <ProjectFormNew />
    </MemoryRouter>,
  );
  await screen.findByText("2026년 2학기");
  fireEvent.click(screen.getByRole("button", { name: "모집 직무 추가" }));
  fireEvent.change(screen.getByLabelText("직무 1"), {
    target: { value: "FRONTEND" },
  });
  fireEvent.change(screen.getByLabelText("모집 인원 1 (명)"), {
    target: { value: "3" },
  });
  fireEvent.click(screen.getByRole("button", { name: "모집 직무 추가" }));
  fireEvent.change(screen.getByLabelText("직무 2"), {
    target: { value: "BACKEND" },
  });
  fireEvent.change(screen.getByLabelText("모집 인원 2 (명)"), {
    target: { value: "2" },
  });
  fireEvent.change(screen.getByLabelText("비밀번호"), {
    target: { value: "pw" },
  });
  await act(async () => {
    fireEvent.submit(
      screen.getByRole("button", { name: "프로젝트 생성" }).closest("form"),
    );
  });
  await waitFor(() =>
    expect(projectApi.createProject).toHaveBeenCalledTimes(1),
  );
  expect(
    (await readProject(projectApi.createProject.mock.calls[0][0]))
      .recruitmentPositions,
  ).toEqual([
    { role: "프론트엔드", count: 3 },
    { role: "백엔드", count: 2 },
  ]);
});

test("수정 화면에서 기존 모집 정보를 불러오고 모두 삭제할 수 있다", async () => {
  render(
    <MemoryRouter>
      <ProjectFormNew
        isEdit
        existingProject={{
          semester: "2026-02",
          recruitmentPositions: [{ role: "백엔드", count: 2 }],
        }}
      />
    </MemoryRouter>,
  );
  expect(screen.getByLabelText("직무 1").value).toBe("BACKEND");
  expect(screen.getByLabelText("모집 인원 1 (명)").value).toBe("2");
  fireEvent.click(screen.getByRole("button", { name: "모집 직무 1 삭제" }));
  fireEvent.change(screen.getByLabelText("비밀번호"), {
    target: { value: "pw" },
  });
  await act(async () => {
    fireEvent.submit(
      screen.getByRole("button", { name: "프로젝트 수정" }).closest("form"),
    );
  });
  await waitFor(() =>
    expect(projectApi.updateProject).toHaveBeenCalledTimes(1),
  );
  expect(
    (await readProject(projectApi.updateProject.mock.calls[0][1]))
      .recruitmentPositions,
  ).toEqual([]);
});

test.each([0, -1, 1.5, ""])(
  "잘못된 모집 인원 %s로는 요청하지 않는다",
  async (count) => {
    render(
      <MemoryRouter>
        <ProjectFormNew />
      </MemoryRouter>,
    );
    await screen.findByText("2026년 2학기");
    fireEvent.click(screen.getByRole("button", { name: "모집 직무 추가" }));
    fireEvent.change(screen.getByLabelText("직무 1"), {
      target: { value: "BACKEND" },
    });
    fireEvent.change(screen.getByLabelText("모집 인원 1 (명)"), {
      target: { value: count },
    });
    fireEvent.change(screen.getByLabelText("비밀번호"), {
      target: { value: "pw" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "프로젝트 생성" }).closest("form"),
    );
    expect(projectApi.createProject).not.toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith(
      "모집 인원은 1 이상의 정수로 입력해 주세요.",
    );
  },
);
