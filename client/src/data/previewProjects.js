// 프로젝트 목록 디자인 확인용 데이터: /ProjectPage?preview=1
const thumbnail = (label, color) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="680" height="400" viewBox="0 0 680 400"><rect width="680" height="400" fill="${color}"/><circle cx="580" cy="60" r="190" fill="white" opacity=".1"/><circle cx="80" cy="390" r="170" fill="white" opacity=".06"/><text x="44" y="220" fill="white" font-family="sans-serif" font-size="60" font-weight="700">${label}</text><text x="48" y="270" fill="white" opacity=".6" font-family="sans-serif" font-size="22">WAP PROJECT</text></svg>`,
  )}`;

export const previewProjects = [
  {
    projectId: "preview-1",
    title: "WAP 아카이브",
    projectType: "Web",
    summary: "동아리의 프로젝트와 활동 기록을 한곳에 모으고, 함께 만든 서비스를 소개하는 공간입니다.",
    thumbnail: thumbnail("ARCHIVE", "#454477"),
  },
  {
    projectId: "preview-2",
    title: "오늘의 캠퍼스",
    projectType: "App",
    summary: "시간표부터 학식과 교내 소식까지, 대학 생활에 필요한 정보를 간편하게 확인하세요.",
    thumbnail: thumbnail("CAMPUS", "#41635b"),
  },
  {
    projectId: "preview-3",
    title: "별빛 탐험대",
    projectType: "Game",
    summary: "작은 우주선을 타고 미지의 행성을 탐험하는 협동 어드벤처 게임입니다.",
    thumbnail: thumbnail("STAR QUEST", "#4b396a"),
  },
  {
    projectId: "preview-4",
    title: "스마트 가든",
    projectType: "기타",
    summary: "센서로 온도와 토양 수분을 측정하고 식물이 자라는 환경을 관리하는 스마트 화분입니다.",
    thumbnail: thumbnail("GARDEN", "#375e70"),
  },
  {
    projectId: "preview-5",
    title: "함께 공부하는 온라인 스터디룸",
    projectType: "Web",
    summary: "공부 목표를 공유하고 집중 시간을 기록하며 서로의 성장을 응원하는 스터디 플랫폼입니다.",
    thumbnail: thumbnail("STUDY ROOM", "#765247"),
  },
  {
    projectId: "preview-6",
    title: "한 걸음",
    projectType: "App",
    summary: "매일의 산책을 기록하고 나만의 동네 코스를 발견하는 걷기 습관 앱입니다.",
    thumbnail: thumbnail("ONE STEP", "#4b5c86"),
  },
];
