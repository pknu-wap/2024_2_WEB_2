import { useState } from "react";
import styles from "../../assets/Admin/ManageThirdTeamBuild.module.css";
import {
  thirdRoundTeams,
  thirdRoundUnassignedMembers,
} from "../../mocks/thirdRoundTeams";

const MEMBER_DRAG_TYPE = "application/x-waps-unassigned-member";

const ManageThirdTeamBuildPage = () => {
  const [{ teams, unassigned, message }, setRoster] = useState(() => ({
    teams: thirdRoundTeams,
    unassigned: thirdRoundUnassignedMembers,
    message: "",
  }));
  const [selectedId, setSelectedId] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const selectedMember = unassigned.find((member) => member.id === selectedId);
  const assignedMemberCount = teams.reduce(
    (total, team) => total + team.members.length,
    0,
  );

  const clearDrag = () => {
    setDraggedId(null);
    setDropTarget(null);
  };

  const assignMember = (memberId, projectId) => {
    setRoster((current) => {
      const member = current.unassigned.find((item) => item.id === memberId);
      const target = current.teams.find((team) => team.projectId === projectId);
      if (!member || !target) return current;

      return {
        teams: current.teams.map((team) =>
          team.projectId === projectId
            ? { ...team, members: [...team.members, member] }
            : team,
        ),
        unassigned: current.unassigned.filter((item) => item.id !== memberId),
        message: `${member.name} 님을 ${target.teamName} 팀에 ${member.position} 직무로 배정했습니다.`,
      };
    });
    setSelectedId(null);
    clearDrag();
  };

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
        <p className={styles.notice}>
          예시 데이터입니다. 배정 내용은 새로고침하면 초기화됩니다.
        </p>
      </header>

      <div className={styles.summary}>
        <span>
          전체 팀 <strong>{teams.length}개</strong>
        </span>
        <span>
          배정 완료 <strong>{assignedMemberCount}명</strong>
        </span>
        <span>
          미배정 <strong>{unassigned.length}명</strong>
        </span>
      </div>

      <section className={styles.unassigned} aria-labelledby="unassigned-title">
        <h2 id="unassigned-title" className={styles.teamName}>
          미배정 멤버
        </h2>
        <p id="assignment-help" className={styles.description}>
          멤버를 팀 카드로 드래그하면 주요 직무로 배정됩니다. 클릭으로 멤버를
          선택한 뒤 팀의 배정 버튼을 눌러도 됩니다.
        </p>
        <div className={styles.unassignedList}>
          {unassigned.map((member) => (
            <button
              key={member.id}
              type="button"
              draggable
              aria-pressed={selectedId === member.id}
              aria-describedby="assignment-help"
              className={`${styles.memberChip} ${selectedId === member.id ? styles.selected : ""}`}
              onClick={() =>
                setSelectedId(selectedId === member.id ? null : member.id)
              }
              onDragStart={(event) => {
                event.dataTransfer.setData(MEMBER_DRAG_TYPE, String(member.id));
                event.dataTransfer.effectAllowed = "move";
                setDraggedId(member.id);
                setSelectedId(null);
              }}
              onDragEnd={clearDrag}
            >
              <span>{member.name}</span>
              <span className={styles.position}>
                주요 직무 · {member.position}
              </span>
            </button>
          ))}
        </div>
        {unassigned.length === 0 && (
          <p className={styles.description}>
            모든 멤버의 배정이 완료되었습니다.
          </p>
        )}
      </section>
      <p role="status" className={styles.notice}>
        {message}
      </p>

      <div className={styles.grid}>
        {teams.map((team) => (
          <article
            key={team.projectId}
            className={`${styles.card} ${dropTarget === team.projectId ? styles.dropTarget : ""}`}
            aria-labelledby={`team-${team.projectId}`}
            onDragOver={(event) => {
              if (draggedId === null) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setDropTarget(team.projectId);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                setDropTarget(null);
            }}
            onDrop={(event) => {
              event.preventDefault();
              const memberId = Number(
                event.dataTransfer.getData(MEMBER_DRAG_TYPE),
              );
              if (draggedId !== null && memberId === draggedId) {
                assignMember(memberId, team.projectId);
              } else {
                clearDrag();
              }
            }}
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
            {selectedMember && (
              <button
                type="button"
                className={styles.assignButton}
                onClick={() => assignMember(selectedMember.id, team.projectId)}
              >
                {selectedMember.name} 님을 {team.teamName}에 배정
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
};

export default ManageThirdTeamBuildPage;
