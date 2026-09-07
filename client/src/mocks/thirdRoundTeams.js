// 3차 팀빌딩 화면용 예시 데이터. members에는 배정이 완료된 멤버만 포함합니다.
export const thirdRoundTeams = [
  {
    projectId: 1,
    teamName: "WAPs",
    members: [
      { id: 1, name: "김민준", position: "FRONTEND" },
      { id: 2, name: "이서연", position: "BACKEND" },
      { id: 3, name: "박지우", position: "DESIGN" },
      { id: 4, name: "최현우", position: "BACKEND" },
    ],
  },
  {
    projectId: 2,
    teamName: "캠퍼스 메이트",
    members: [
      { id: 5, name: "정하린", position: "APP" },
      { id: 6, name: "강도윤", position: "BACKEND" },
      { id: 7, name: "윤수빈", position: "DESIGN" },
    ],
  },
  {
    projectId: 3,
    teamName: "AI 스터디 플래너",
    members: [
      { id: 8, name: "임서준", position: "AI" },
      { id: 9, name: "한예린", position: "FRONTEND" },
      { id: 10, name: "오지호", position: "BACKEND" },
    ],
  },
  {
    projectId: 4,
    teamName: "플레이 그라운드",
    members: [
      { id: 11, name: "신유진", position: "GAME" },
      { id: 12, name: "조시우", position: "GAME" },
    ],
  },
  {
    projectId: 5,
    teamName: "스마트 캠퍼스",
    members: [
      { id: 13, name: "장민서", position: "EMBEDDED" },
      { id: 14, name: "문하준", position: "APP" },
    ],
  },
  { projectId: 6, teamName: "오늘의 기록", members: [] },
];

// 실제 사용자와 연결되지 않은 직무별 인원 자리입니다.
export const thirdRoundPositionSlots = [
  { id: "slot-frontend-1", type: "POSITION_SLOT", position: "FRONTEND" },
  { id: "slot-frontend-2", type: "POSITION_SLOT", position: "FRONTEND" },
  { id: "slot-frontend-3", type: "POSITION_SLOT", position: "FRONTEND" },
  { id: "slot-backend-1", type: "POSITION_SLOT", position: "BACKEND" },
  { id: "slot-design-1", type: "POSITION_SLOT", position: "DESIGN" },
  { id: "slot-ai-1", type: "POSITION_SLOT", position: "AI" },
  { id: "slot-app-1", type: "POSITION_SLOT", position: "APP" },
  { id: "slot-game-1", type: "POSITION_SLOT", position: "GAME" },
  { id: "slot-embedded-1", type: "POSITION_SLOT", position: "EMBEDDED" },
];
