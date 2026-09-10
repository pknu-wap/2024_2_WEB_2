import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { projectApi } from "../../api/project";
import Cookies from "../../utils/authStorage";
import ProjectDetailForm from "./ProjectDetailForm";
import ProjectDelete from "../ProjectDelete/ProjectDelete";

jest.mock("../../api/project", () => ({
  projectApi: {
    getProjectDetail: jest.fn(),
    getprojectUpdatePage: jest.fn(),
    deleteProject: jest.fn(),
  },
}));
jest.mock("../../utils/authStorage", () => ({ get: jest.fn() }));
jest.mock("./Comments/Comments", () => () => null);
jest.mock("./Comments/CommentsList", () => () => null);
jest.mock("../LoadingPage", () => () => <p>Loading</p>);

function openPage(Component) {
  render(
    <MemoryRouter initialEntries={["/project/10"]}>
      <Routes>
        <Route path="/project/:projectId" element={<Component />} />
        <Route path="/project/edit/:projectId" element={<p>Edit page</p>} />
        <Route path="/" element={<p>Home page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  Cookies.get.mockReturnValue("token");
  jest.spyOn(window, "confirm").mockReturnValue(true);
  jest.spyOn(window, "alert").mockImplementation(() => {});
  projectApi.getProjectDetail.mockResolvedValue({
    title: "Project title",
    isOwner: false,
    canManage: true,
  });
  projectApi.getprojectUpdatePage.mockResolvedValue({});
  projectApi.deleteProject.mockResolvedValue(undefined);
});

afterEach(() => jest.restoreAllMocks());

describe.each([
  ["상세 화면", ProjectDetailForm],
  ["삭제 화면", ProjectDelete],
])("%s", (_, Component) => {
  test.each([true, false])(
    "작성자 여부가 %s여도 관리 권한이 있으면 삭제할 수 있다",
    async (isOwner) => {
      projectApi.getProjectDetail.mockResolvedValue({
        title: "Project title",
        isOwner,
        canManage: true,
      });
      openPage(Component);
      fireEvent.click(await screen.findByRole("button", { name: "삭제하기" }));
      await screen.findByText("Home page");
      expect(projectApi.deleteProject).toHaveBeenCalledWith("10");
      expect(window.alert).toHaveBeenCalledWith(
        "프로젝트가 성공적으로 삭제되었습니다.",
      );
    },
  );

  test.each([
    ["token", false],
    ["token", undefined],
    [undefined, true],
  ])(
    "인증 또는 관리 권한이 없으면 버튼을 숨긴다 (%s, %s)",
    async (token, canManage) => {
      Cookies.get.mockReturnValue(token);
      projectApi.getProjectDetail.mockResolvedValue({
        title: "Project title",
        isOwner: false,
        canManage,
      });
      openPage(Component);
      await screen.findByText("Project title");
      expect(screen.queryByRole("button", { name: "삭제하기" })).toBeNull();
      expect(screen.queryByRole("button", { name: "수정하기" })).toBeNull();
      expect(projectApi.deleteProject).not.toHaveBeenCalled();
    },
  );

  test("삭제 확인을 취소하면 요청하지 않는다", async () => {
    window.confirm.mockReturnValue(false);
    openPage(Component);
    fireEvent.click(await screen.findByRole("button", { name: "삭제하기" }));
    expect(projectApi.deleteProject).not.toHaveBeenCalled();
  });
});

test("관리자는 타인의 게시물 수정 화면으로 이동할 수 있다", async () => {
  openPage(ProjectDetailForm);
  fireEvent.click(await screen.findByRole("button", { name: "수정하기" }));
  await screen.findByText("Edit page");
  expect(projectApi.getprojectUpdatePage).toHaveBeenCalledWith("10");
});

test("버튼 표시 후 서버가 수정 권한을 거절하면 이동하지 않는다", async () => {
  projectApi.getprojectUpdatePage.mockRejectedValue({
    response: { status: 403 },
  });
  openPage(ProjectDetailForm);
  fireEvent.click(await screen.findByRole("button", { name: "수정하기" }));
  await waitFor(() =>
    expect(window.alert).toHaveBeenCalledWith("수정 권한이 없습니다."),
  );
  expect(screen.queryByText("Edit page")).toBeNull();
});

test("상세 화면에 직무별 모집 인원을 표시한다", async () => {
  projectApi.getProjectDetail.mockResolvedValue({
    title: "Project title",
    recruitmentPositions: [
      { role: "프론트엔드", count: 3 },
      { role: "백엔드", count: 2 },
    ],
  });
  openPage(ProjectDetailForm);
  expect(await screen.findByText("프론트엔드 3명, 백엔드 2명")).toBeTruthy();
});

test("기존 게시글에는 모집 정보가 없음을 표시한다", async () => {
  openPage(ProjectDetailForm);
  expect(
    await screen.findByText("등록된 모집 인원 정보가 없습니다."),
  ).toBeTruthy();
});
