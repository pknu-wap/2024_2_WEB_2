import apiClient from "./client";
import { thirdRoundApi } from "./third-round";
jest.mock("./client", () => ({
  post: jest.fn(),
  get: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
}));

test("서버 배치안 ID와 버전으로 생성·이동·삭제 요청을 전송한다", () => {
  thirdRoundApi.open();
  expect(apiClient.post).toHaveBeenCalledWith(
    "/admin/team/building/third-round/open",
  );
  thirdRoundApi.complete(6);
  expect(apiClient.post).toHaveBeenCalledWith(
    "/admin/team/building/third-round/complete",
    { revision: 6 },
  );
  thirdRoundApi.shuffle(1);
  expect(apiClient.post).toHaveBeenCalledWith(
    "/admin/team/building/third-round/shuffle",
    { revision: 1 },
  );
  thirdRoundApi.create(2);
  expect(apiClient.post).toHaveBeenCalledWith(
    "/admin/team/building/third-round/teams",
    { revision: 2 },
  );
  thirdRoundApi.move("slot-7", 3, 4);
  expect(apiClient.patch).toHaveBeenCalledWith(
    "/admin/team/building/third-round/slots/7",
    { teamId: 3, revision: 4 },
  );
  thirdRoundApi.move("slot-7", null, 5);
  expect(apiClient.patch).toHaveBeenCalledWith(
    "/admin/team/building/third-round/slots/7",
    { teamId: null, revision: 5 },
  );
  thirdRoundApi.delete(3, 5);
  expect(apiClient.delete).toHaveBeenCalledWith(
    "/admin/team/building/third-round/teams/3",
    { data: { revision: 5 } },
  );
});
