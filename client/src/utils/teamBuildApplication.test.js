import {
  getProjectTeamLabels,
  getProjectTeamType,
  getPositionLabel,
  getPrimaryPositionLabel,
  PRIMARY_POSITION_OPTIONS,
} from "./teamBuildApplication";

test.each([
  [" web ", "WEB"],
  ["App", "APP"],
  ["embedded", "EMBEDDED"],
  ["etc", "OTHER"],
  ["기타", "OTHER"],
  [undefined, "OTHER"],
  ["custom", "CUSTOM"],
])("프로젝트 유형 %s를 %s로 표시한다", (input, expected) => {
  expect(getProjectTeamType(input)).toBe(expected);
});

test("섞인 프로젝트 목록에서도 유형별 원래 순서와 ID 비교 방식을 유지한다", () => {
  const projects = [
    { projectId: 1, projectType: "web" },
    { projectId: 2, projectType: "APP" },
    { projectId: 3, projectType: "WEB" },
    { projectId: "1", projectType: "WEB" },
    { projectId: 4, projectType: "WEB" },
    { projectId: 5, projectType: "etc" },
    { projectId: 6, projectType: "기타" },
    { projectId: 7, projectType: "embedded" },
  ];
  expect([...getProjectTeamLabels(projects).values()]).toEqual([
    "WEB 1",
    "APP 1",
    "WEB 2",
    "WEB 1",
    "WEB 4",
    "기타 1",
    "기타 2",
    "EMBEDDED 1",
  ]);
});

test("지원 직무와 주요 직무의 기타 및 미선택 표시를 구분한다", () => {
  expect(getPositionLabel("OTHER")).toBe("OTHER");
  expect(getPrimaryPositionLabel("OTHER")).toBe("기타");
  expect(getPrimaryPositionLabel("")).toBe("미선택");
  expect(PRIMARY_POSITION_OPTIONS.map(({ value }) => value)).toEqual([
    "BACKEND",
    "FRONTEND",
    "DESIGN",
    "GAME",
    "APP",
    "EMBEDDED",
    "AI",
    "OTHER",
  ]);
});
