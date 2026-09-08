export const MIN_APPLICATIONS = 2;
export const MAX_APPLICATIONS = 5;
export const MAX_MESSAGE_LENGTH = 60;

const POSITION_LABELS = {
  FRONTEND: "프론트엔드",
  BACKEND: "백엔드",
  AI: "AI",
  DESIGN: "디자이너",
  APP: "앱",
  GAME: "게임",
  EMBEDDED: "임베디드",
};

export const getPositionLabel = (value) => POSITION_LABELS[value] || value;

export const PRIMARY_POSITION_OPTIONS = [
  "BACKEND",
  "FRONTEND",
  "DESIGN",
  "GAME",
  "APP",
  "EMBEDDED",
  "AI",
  "OTHER",
].map((value) => ({
  value,
  label: value === "OTHER" ? "기타" : getPositionLabel(value),
}));

export const getPrimaryPositionLabel = (value) =>
  PRIMARY_POSITION_OPTIONS.find((option) => option.value === value)?.label ||
  "미선택";

export const getProjectTeamType = (projectType) => {
  const type = String(projectType || "")
    .trim()
    .toUpperCase();
  return !type || type === "ETC" || type === "기타" ? "OTHER" : type;
};

export const getProjectTeamLabels = (projects) => {
  const groups = new Map();
  const labels = new Map();

  for (const project of projects) {
    const type = getProjectTeamType(project.projectType);
    if (!groups.has(type)) groups.set(type, { count: 0, numbers: new Map() });
    const group = groups.get(type);
    const id = String(project.projectId);
    group.count += 1;
    if (!group.numbers.has(id)) group.numbers.set(id, group.count);
    labels.set(
      project,
      `${type === "OTHER" ? "기타" : type} ${group.numbers.get(id)}`,
    );
  }

  return labels;
};
