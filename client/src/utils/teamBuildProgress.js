export const getTeamBuildStep = ({ status, round = 1, completedRound = 0 }) => {
  if (completedRound >= 3) return "RESULT";
  if (completedRound >= 2) return "THIRD";
  if (status === "APPLY" || status === "RECRUIT") return `${status}_${round}`;
  if (status === "CLOSED") return `RECRUIT_${round}`;
  return status;
};

// Completed allocations remain intact; only reopen stages within the active round.
export const getPreviousTeamBuildStatus = ({ status, round, completedRound }) => {
  if (completedRound >= round) return null;
  if (status === "CLOSED") return "RECRUIT";
  if (status === "RECRUIT") return "APPLY";
  if (status === "APPLY" && round === 1) return "OPEN";
  return null;
};
