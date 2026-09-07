export const getTeamBuildStep = ({ status, round = 1, completedRound = 0 }) => {
  if (completedRound >= 3) return "RESULT";
  if (completedRound >= 2) return "THIRD";
  if (status === "APPLY" || status === "RECRUIT") return `${status}_${round}`;
  // CLOSED means recruitment is closed, not necessarily that allocation is done.
  // Keep round 1 on recruitment until the server opens round 2.
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

export const getNextTeamBuildStatus = ({ status, round, completedRound }) => {
  if (round !== 1 && round !== 2) return null;
  if (status === "CLOSED") {
    // The server increments its stored round on this transition.
    return round === 1 && completedRound === 1 ? "APPLY" : null;
  }
  if (completedRound !== round - 1) return null;
  if (status === "OPEN" && round === 1) return "APPLY";
  if (status === "APPLY") return "RECRUIT";
  if (status === "RECRUIT") return "CLOSED";
  return null;
};

export const getTeamBuildAllocationState = ({ status, round, completedRound }) => {
  if (status !== "CLOSED" || ![1, 2, 3].includes(round)) return null;
  if (completedRound === round) return "COMPLETED";
  if (round <= 2 && completedRound === round - 1) return "PENDING";
  return null;
};
