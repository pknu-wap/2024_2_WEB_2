import apiClient from "./client";

const base = "/admin/team/building/third-round";

export const thirdRoundApi = {
  open: () => apiClient.post(`${base}/open`),
  get: () => apiClient.get(base),
  create: (revision) => apiClient.post(`${base}/teams`, { revision }),
  move: (slotId, teamId, revision) =>
    apiClient.patch(
      `${base}/slots/${encodeURIComponent(slotId.replace(/^slot-/, ""))}`,
      {
        teamId,
        revision,
      },
    ),
  delete: (teamId, revision) =>
    apiClient.delete(`${base}/teams/${teamId}`, { data: { revision } }),
};
