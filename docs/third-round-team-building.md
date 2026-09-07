# 3차 팀빌딩 배치안

관리자는 `/admin/teambuild/3rd`에서 기존 팀을 조회하고 직무별 인원을 배치·이동하며 빈 팀을 생성·삭제할 수 있다. 변경은 서버에 저장된다.

## 데이터와 진행 단계

- 현재 학기의 팀빌딩이 `CLOSED`이고 `completedRound = 2`일 때 사용할 수 있다.
- 첫 진입의 `POST /open`은 학기당 한 번 배치안을 초기화한다. 이후 진입은 저장된 배치안을 반환한다.
- 기존 팀은 현재 학기 프로젝트와 확정된 `Team` 배정 결과를 사용한다. 확정 멤버의 직무와 이름은 조회되며, 이 API로 이동·삭제하지 않는다.
- 초기 직무 인원은 기존 팀원·프로젝트 팀장을 제외한 지원자의 최신 차수 최우선 지원 직무에서 산출한다. 유효한 기존 클러스터 직무 수정이 있으면 반영한다.
- 산출 결과는 사용자와 연결하지 않은 `ThirdRoundPositionSlot`으로 저장한다. 같은 직무의 여러 자리는 서로 다른 ID를 가지며 이름·사용자 ID를 포함하지 않는다.
- 초기화 후 지원자/클러스터를 별도 도구로 수정해도 이 배치안의 직무 인원 수는 자동 재산출하지 않는다. 클러스터 수정은 배치안 초기화 전에 완료해야 한다.
- 생성 팀은 실제 프로젝트가 아닌 배치안의 팀이다. `팀 A`부터 시작하고 `팀 Z` 다음은 `팀 AA`이며, 삭제된 번호는 재사용하지 않는다.
- 생성 팀을 삭제하면 소속 직무 자리가 미배정으로 돌아간다.
- 이 기능은 직무 인원 배치안 저장까지 처리한다. 실제 사용자를 팀에 확정 배정하거나 기존 `ThirdRoundTeamBuildingService.allocate()`를 실행하지 않는다.

## API

모든 경로의 접두사는 `/admin/team/building/third-round`이며 관리자 인증이 필요하다.

| 메서드 | 경로 | 요청 | 동작 |
| --- | --- | --- | --- |
| POST | `/open` | 없음 | 초기화 또는 저장된 배치안 열기 |
| GET | 빈 경로 | 없음 | 초기화된 배치안 조회 |
| POST | `/teams` | `{ "revision": 0 }` | 빈 팀 생성 |
| PATCH | `/slots/{slotId}` | `{ "revision": 1, "teamId": 7 }` | 직무 자리 배치·이동 |
| PATCH | `/slots/{slotId}` | `{ "revision": 2, "teamId": null }` | 미배정으로 복귀 |
| DELETE | `/teams/{teamId}` | `{ "revision": 3 }` | 생성 팀 삭제 및 자리 복귀 |

응답은 모두 `{ semester, revision, teams, unassigned }` 형태의 전체 배치안이다.

- `teams[].id`: 배치안 팀 ID. 이동·삭제 API에 사용한다.
- `teams[].projectId`: 기존 프로젝트 ID. 생성 팀은 `null`이다.
- `teams[].isCreated`: 삭제 가능한 생성 팀인지 나타낸다.
- `members[]`, `unassigned[]`: `{ id, type, position, name? }`.
- 직무 자리는 `type = POSITION_SLOT`, `id = slot-7` 형태이며 `name`을 응답하지 않는다. 이동 URL에는 숫자 부분 `7`을 사용한다.
- 확정 멤버는 `type = MEMBER`, `id = member-사용자ID` 형태이다.

수정 요청에는 마지막 조회 응답의 `revision`을 포함한다. 서버는 학기 메타 행을 잠근 뒤 버전을 확인한다. 오래된 버전은 `409`로 거절하며 클라이언트는 최신 배치안을 조회한다. 다른 학기의 팀·자리 ID는 `404`, 기존 프로젝트 팀 삭제는 `400`이다. 동일 팀으로 이동하는 요청은 인원과 버전을 변경하지 않는다.

## 마이그레이션과 검증

Flyway `V9__create_third_round_plan.sql`이 배치안, 팀, 직무 자리 테이블과 외래 키를 생성한다. 서버를 먼저 배포하고 프론트엔드를 배포한다.

```sh
cd server
./gradlew test --offline --tests '*Test'
```

실제 MySQL 테스트는 **별도의 폐기 가능한 DB**에서만 실행한다. `ThirdRoundPlanIntegrationTest`는 해당 DB의 배치안 테이블 3개와 `team_building_meta`를 재생성한다.

```sh
THIRD_ROUND_TEST_URL=jdbc:mysql://127.0.0.1:13316/third_round_test \
THIRD_ROUND_TEST_USER=root \
THIRD_ROUND_TEST_PASSWORD=test-password \
./gradlew test --offline --tests '*ThirdRoundPlanIntegrationTest'
```

이 테스트는 V9 SQL을 실행한 뒤 Hibernate 스키마 검증, 트랜잭션 간 재조회, 이동·삭제와 외래 키 처리, 동시 수정 충돌을 확인한다.

```sh
cd client
CI=true npm test -- --watchAll=false --runInBand
npm run build
```
