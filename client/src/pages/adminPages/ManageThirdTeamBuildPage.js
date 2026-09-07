import styles from "../../assets/Admin/ManageThirdTeamBuild.module.css";
import { thirdRoundTeams } from "../../mocks/thirdRoundTeams";

const ManageThirdTeamBuildPage = () => {
  const assignedMemberCount = thirdRoundTeams.reduce(
    (total, team) => total + team.members.length,
    0,
  );

  return (
    <section
      className={styles.container}
      aria-labelledby="third-team-build-title"
    >
      <header className={styles.header}>
        <h1 id="third-team-build-title" className={styles.title}>
          3차 팀빌딩
        </h1>
        <p className={styles.description}>
          팀별 배정이 완료된 멤버와 담당 직무를 확인하세요.
        </p>
        <p className={styles.notice}>예시 데이터로 구성된 화면입니다.</p>
      </header>

      <div className={styles.summary}>
        <span>
          전체 팀 <strong>{thirdRoundTeams.length}개</strong>
        </span>
        <span>
          배정 완료 <strong>{assignedMemberCount}명</strong>
        </span>
      </div>

      <div className={styles.grid}>
        {thirdRoundTeams.map((team) => (
          <article
            key={team.projectId}
            className={styles.card}
            aria-labelledby={`team-${team.projectId}`}
          >
            <div className={styles.cardHeader}>
              <h2 id={`team-${team.projectId}`} className={styles.teamName}>
                {team.teamName}
              </h2>
              <span className={styles.badge}>
                배정 완료 {team.members.length}명
              </span>
            </div>
            {team.members.length > 0 ? (
              <table
                className={styles.members}
                aria-label={`${team.teamName} 배정 명단`}
              >
                <thead>
                  <tr>
                    <th scope="col">배정 직무</th>
                    <th scope="col">이름</th>
                  </tr>
                </thead>
                <tbody>
                  {team.members.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <span className={styles.position}>
                          {member.position}
                        </span>
                      </td>
                      <td>{member.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className={styles.empty}>아직 배정된 멤버가 없습니다.</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
};

export default ManageThirdTeamBuildPage;
