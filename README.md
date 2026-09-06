# WAPs

## 🎯 WAP 활동을 한곳에 모으는 통합 아카이빙 서비스!

WAP은 프로젝트, 팀 빌딩, 발표, 행사 등 다양한 활동이 이루어지지만<br>
정보가 흩어져 운영 효율이 떨어지고, 활동 기록이 금방 사라지는 문제가 있었다.<br>

WAPs는 동아리의 모든 활동을 ‘프로젝트 데이터 중심’으로 묶어주는 플랫폼으로,<br>
WAP 구성원이 보다 편하게 탐색하고 참여하며 기록을 남길 수 있도록 돕는다.<br>

## 🖼️ WAPs 핵심 기능 소개

🔍 프로젝트 탐색 & 아카이빙

- 프로젝트 설명, 썸네일, 참여 인원 등 한 학기의 프로젝트를 한 화면에서 파악할 수 있다.
- 이전 학기 작품도 쉽게 찾아볼 수 있는 데이터 기반 아카이빙 기능을 제공한다.

🗳️ 프로젝트 투표

- 투표 집계 및 학기별 인기 프로젝트를 확인할 수 있다.

👥 팀 빌딩

- 학기별 팀 편성 서비스를 제공한다.
- 지원과 모집을 우선순위 기반 알고리즘으로 팀 편성을 진행한다.

📅 캘린더 기능

- 행사, 일정, 발표 등 WAP의 모든 중요한 이벤트를 보여준다.

## 🛠️ 사용 기술 스택

| 구분               | 기술                                    |
| ------------------ | --------------------------------------- |
| **Frontend**       | React, JavaScript, CSS                  |
| **Backend**        | Java, Spring Boot, Spring Security, JPA |
| **Database**       | MySQL                                   |
| **Infrastructure** | Oracle Cloud, Grafana, Prometheus       |

## 💻 실행 방법

클라이언트와 서버는 각각 별도의 터미널에서 실행한다. 아래 명령은 저장소 루트에서 시작한다.

### 🖥️ Client

1. 의존성을 설치한다.

   ```bash
   cd client
   npm ci
   ```

2. `client/.env.local` 파일을 만들고 API 서버 주소를 설정한다.

   ```dotenv
   REACT_APP_API_BASE_URL=http://localhost:8080
   ```

3. 개발 서버를 실행한다.

   ```bash
   npm start
   ```

### ⚙️ Server

1. MySQL에 로컬 개발용 `waps` 데이터베이스를 준비한다.

2. `server/.env` 파일에 아래 설정을 작성한다. 빈 값은 직접 작성한다.

   ```yaml
   DB_HOST: "localhost"
   DB_PORT: "3306"
   DB_NAME: "waps"
   DB_USER: ""
   DB_PASSWORD: ""
   JWT_SECRET_KEY: ""
   KAKAO_REST_API_KEY: ""
   SERVER_URL: "http://localhost:8080"
   SWAGGER_SERVER_URL: "http://localhost:8080"
   SPRING_PROFILES_ACTIVE: "local"
   ```

   `local` 프로필에서는 클라우드 스토리지를 사용하지 않아 이미지 업로드가 실제로 저장되지 않는다. 업로드 기능을 사용하려면 `oracle`, `aws`, `azure` 중 하나의 프로파일과 해당 스토리지 설정이 필요하다.

3. 서버를 실행한다.

   ```bash
   cd server
   ./gradlew bootRun
   ```

## 🚀 WAPs service

[Waps 보러가기](https://waps.im)

## 👤 참여 인원

<table>
  <tr>
  <td align="center">
       <img src="https://github.com/daimlee.png" width="120px;"/>   
        <br />
        <a href="https://github.com/daimlee" title="Code"><b>daimlee</b></a>
    </td>
    <td align="center">
        <img src="https://github.com/kangrae-jo.png" width="120px;"/>   
        <br />
        <a href="https://github.com/kangrae-jo" title="Code"><b>kangrae-jo</b></a>
    </td>
    <td align="center">
        <img src="https://github.com/g0rnn.png" width="120px;"/>   
        <br />
        <a href="https://github.com/g0rnn" title="Code"><b>g0rnn</b></a>
    </td>
    <td align="center">
        <img src="https://github.com/SH-MooDy.png" width="120px;"/>   
        <br/>
        <a href="https://github.com/SH-MooDy" title="Code"><b>SH-MooDy</b></a>
    </td>
    <td align="center">
        <img src="https://github.com/1lisalozf.png" width="120px;"/> 
        <br/>
        <a href="https://github.com/1lisalozf" title="Code"><b>1lisalozf</b></a>
    </td> 
  </tr>
  <tr>
    <td align="center">
       <img src="https://github.com/2siyeon.png" width="120px;"/>   
        <br />
        <a href="https://github.com/2siyeon" title="Code"><b>2siyeon</b></a>
    </td>
    <td align="center">
       <img src="https://github.com/seizethedayunhui.png" width="120px;"/>   
        <br />
        <a href="https://github.com/seizethedayunhui" title="Code"><b>seizethedayunhui</b></a>
    </td>
    <td align="center">
       <img src="https://github.com/psvm203.png" width="120px;"/>   
        <br />
        <a href="https://github.com/psvm203" title="Code"><b>psvm203</b></a>
    </td>
  </tr>
</table>
