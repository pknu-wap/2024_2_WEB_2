import { getTeamBuildStep, getPreviousTeamBuildStatus } from "./teamBuildProgress";

test.each([
  ["OPEN", 1, 0, "OPEN"],
  ["APPLY", 1, 0, "APPLY_1"],
  ["RECRUIT", 1, 0, "RECRUIT_1"],
  ["CLOSED", 1, 0, "RECRUIT_1"],
  ["CLOSED", 1, 1, "RECRUIT_1"],
  ["APPLY", 2, 1, "APPLY_2"],
  ["RECRUIT", 2, 1, "RECRUIT_2"],
  ["CLOSED", 2, 1, "RECRUIT_2"],
  ["CLOSED", 2, 2, "THIRD"],
  ["CLOSED", 3, 3, "RESULT"],
  ["unavailable", 1, 0, "unavailable"],
])("maps %s in round %i with completed round %i to %s", (status, round, completedRound, expected) => {
  expect(getTeamBuildStep({ status, round, completedRound })).toBe(expected);
});

test.each([
  ["APPLY", 1, 0, "OPEN"],
  ["RECRUIT", 1, 0, "APPLY"],
  ["CLOSED", 1, 0, "RECRUIT"],
  ["CLOSED", 1, 1, null],
  ["APPLY", 2, 1, null],
  ["RECRUIT", 2, 1, "APPLY"],
  ["CLOSED", 2, 1, "RECRUIT"],
  ["CLOSED", 2, 2, null],
  ["CLOSED", 3, 3, null],
  ["OPEN", 1, 0, null],
])("rolls back %s round %i completed %i to %s", (status, round, completedRound, expected) => {
  expect(getPreviousTeamBuildStatus({ status, round, completedRound })).toBe(expected);
});
