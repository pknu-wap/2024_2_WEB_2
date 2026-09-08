import apiClient from "./client";

// 팀빌딩 API
export const teamBuildApi = {
  // 팀빌딩 결과 조회
  getTeamBuildResults: () => apiClient.get("/team-build/results"),

  getRecruitProjects: () => apiClient.get("/team-build/recruit/projects"),

  closeRecruitment: (projectId, completedRound) =>
    apiClient.post(`/team-build/recruit/${projectId}/close`, null, {
      params: { completedRound },
    }),

  getStatus: () => apiClient.get("/team-build/status"),

  // 리더 모집하기 - 프로젝트 지원자 조회
  getRecruitApplies: (projectId, round = 1) =>
    apiClient.get(`/team-build/${projectId}/applies`, {
      params: { round },
    }),

  // 리더 모집하기 - 우선순위 제출
  submitRecruitPreference: (payload, round = 1) =>
    apiClient.post("/team-build/recruit/submit", payload, {
      params: { round },
    }),

  // 팀원 지원 상태 조회 (이미 지원 여부)
  getApplyStatus: () => apiClient.get("/team-build/apply/status"),

  // 팀원 지원 가능 프로젝트 목록
  getApplyProjects: () => apiClient.get("/team-build/projects"),

  // 팀원 지원 제출
  submitApply: (payload, round = 1) =>
    apiClient.post("/team-build/apply/submit", payload, {
      params: { round },
    }),

  // 현재 사용자 역할 조회
  getRole: () => apiClient.get("/team-build/role"),
};
