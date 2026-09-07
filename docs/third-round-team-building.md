# 3차 팀빌딩 배치안

관리자는 `/admin/teambuild/3rd`에서 기존 팀을 조회하고 직무별 인원을 배치·이동하며 빈 팀을 생성·삭제할 수 있다. 변경은 서버에 저장된다.

## 데이터와 진행 단계

- 현재 학기의 팀빌딩이 `CLOSED`이고 `completedRound = 2`일 때 편집할 수 있다. 완료 후에는 저장된 배치안을 조회할 수 있다.
- 첫 진입의 `POST /open`은 학기당 한 번 배치안을 초기화한다. 이후 진입은 저장된 배치안을 반환한다.
- 기존 팀은 현재 학기 프로젝트와 확정된 `Team` 배정 결과를 사용한다. 확정 멤버의 직무와 이름은 조회되며, 이 API로 이동·삭제하지 않는다.
- 초기 직무 인원은 기존 팀원·프로젝트 팀장을 제외한 지원자의 최신 차수 최우선 지원 직무에서 산출한다. 유효한 기존 클러스터 직무 수정이 있으면 반영한다.
- 산출 결과는 지원자 ID와 연결한 `ThirdRoundPositionSlot`으로 저장한다. 이름은 사용자 정보에서 조회하며 화면에는 `이름(직무)`로 표시한다. 기존 익명 자리는 같은 직무의 미배정 지원자를 사용자 ID 순으로 연결하고 기존 팀 배치를 유지한다. 연결할 지원자가 없는 기존 자리는 직무만 표시한다.
- 초기화 후 지원자/클러스터를 별도 도구로 수정해도 이 배치안의 직무 인원 수는 자동 재산출하지 않는다. 클러스터 수정은 배치안 초기화 전에 완료해야 한다.
- 생성 팀은 실제 프로젝트가 아닌 배치안의 팀이다. `팀 A`부터 시작하고 `팀 Z` 다음은 `팀 AA`이며, 삭제된 번호는 재사용하지 않는다.
- 셔플은 3차 배치안의 지원자를 같은 직무끼리 무작위로 재배치한다. 팀별 직무 인원수와 미배정 직무 인원수는 유지하며, 미배정 목록과 팀에 배치한 지원자를 모두 포함한다. 기존 확정 멤버와 지원자가 연결되지 않은 익명 자리는 유지한다. 무작위 결과가 기존 배치와 같을 수도 있으며 결과는 자동 저장된다.
- 생성 팀을 삭제하면 소속 직무 자리가 미배정으로 돌아간다.
- `팀 빌딩 완료`는 현재 버전의 배치를 트랜잭션으로 확정하고 3차 완료 상태로 전환한다. 기존 프로젝트의 추가 인원은 `Team`에 3차 배정으로 저장하며, 생성 팀은 완료된 배치안에서 결과로 조회한다. 생성 팀의 팀장은 미지정이다. 남은 미배정 지원자는 결과에서도 미배정으로 표시한다.
- 완료 후에는 배치·셔플·팀 생성·삭제·재완료가 차단된다. 관리자 전체 팀빌딩 초기화는 배치안도 함께 삭제한다.

## API

모든 경로의 접두사는 `/admin/team/building/third-round`이며 관리자 인증이 필요하다.

| 메서드 | 경로 | 요청 | 동작 |
| --- | --- | --- | --- |
| POST | `/open` | 없음 | 초기화 또는 저장된 배치안 열기 |
| GET | 빈 경로 | 없음 | 초기화된 배치안 조회 |
| POST | `/complete` | `{ "revision": 0 }` | 현재 배치를 결과로 확정 |
| POST | `/shuffle` | `{ "revision": 0 }` | 같은 직무 지원자 셔플 및 저장 |
| POST | `/teams` | `{ "revision": 0 }` | 빈 팀 생성 |
| PATCH | `/slots/{slotId}` | `{ "revision": 1, "teamId": 7 }` | 직무 자리 배치·이동 |
| PATCH | `/slots/{slotId}` | `{ "revision": 2, "teamId": null }` | 미배정으로 복귀 |
| DELETE | `/teams/{teamId}` | `{ "revision": 3 }` | 생성 팀 삭제 및 자리 복귀 |

응답은 모두 `{ semester, revision, teams, unassigned, completed }` 형태의 전체 배치안이다.

- `teams[].id`: 배치안 팀 ID. 이동·삭제 API에 사용한다.
- `teams[].projectId`: 기존 프로젝트 ID. 생성 팀은 `null`이다.
- `teams[].leader`: 기존 프로젝트 팀장의 `{ id, name }`. 생성 팀은 `null`이며 화면에는 미지정으로 표시한다. 팀장은 배치 인원과 별도로 표시한다.
- `teams[].isCreated`: 삭제 가능한 생성 팀인지 나타낸다.
- `members[]`, `unassigned[]`: `{ id, type, position, name? }`.
- 직무 자리는 `type = POSITION_SLOT`, `id = slot-7` 형태이며 지원자의 `name`을 함께 응답한다. 이동 URL에는 숫자 부분 `7`을 사용한다.
- 확정 멤버는 `type = MEMBER`, `id = member-사용자ID` 형태이다.

수정 요청에는 마지막 조회 응답의 `revision`을 포함한다. 서버는 학기 메타 행을 잠근 뒤 버전을 확인한다. 오래된 버전은 `409`로 거절하며 클라이언트는 최신 배치안을 조회한다. 다른 학기의 팀·자리 ID는 `404`, 기존 프로젝트 팀 삭제는 `400`이다. 동일 팀으로 이동하는 요청은 인원과 버전을 변경하지 않는다.

## 마이그레이션과 검증

Flyway `V11__complete_third_round_plan.sql`이 완료 상태 열을 추가한다. `V10__identify_third_round_applicants.sql`이 지원자 ID 열을 추가한다. `V9__create_third_round_plan.sql`이 배치안, 팀, 직무 자리 테이블과 외래 키를 생성한다. 서버를 먼저 배포하고 프론트엔드를 배포한다.

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

완료된 생성 팀은 결과 응답에 `planTeamId`로 식별하며 `projectId`, `leader`는 `null`이다. 기존 프로젝트 결과 형식은 유지된다.
