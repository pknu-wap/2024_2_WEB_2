import { useEffect, useRef, useState } from "react";
import styles from "../../assets/Admin/ManageThirdTeamBuild.module.css";
import {
  thirdRoundTeams,
  thirdRoundUnassignedMembers,
} from "../../mocks/thirdRoundTeams";

const ManageThirdTeamBuildPage = () => {
  const [{ teams, unassigned, message }, setRoster] = useState(() => ({
    teams: thirdRoundTeams,
    unassigned: thirdRoundUnassignedMembers,
    message: "",
  }));
  const [selectedId, setSelectedId] = useState(null);
  const dragRef = useRef(null);
  const containerRef = useRef(null);
  const suppressClick = useRef(false);
  const [dragPreview, setDragPreview] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const selectedMember = unassigned.find((member) => member.id === selectedId);
  const assignedMemberCount = teams.reduce(
    (total, team) => total + team.members.length,
    0,
  );

  const clearDrag = () => {
    dragRef.current = null;
    setDragPreview(null);
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

  const teamAtPoint = (x, y) => {
    const card = document.elementFromPoint(x, y)?.closest("[data-team-id]");
    return card && containerRef.current?.contains(card)
      ? Number(card.dataset.teamId)
      : null;
  };

  useEffect(() => {
    if (!dragPreview) return;
    let frame;
    const scroll = () => {
      const drag = dragRef.current;
      const container = containerRef.current;
      if (!drag?.active || !container) return;
      const bounds = container.getBoundingClientRect();
      if (drag.x >= bounds.left && drag.x <= bounds.right) {
        const speed =
          drag.y > bounds.bottom - 60 ? 12 : drag.y < bounds.top + 60 ? -12 : 0;
        container.scrollTop += speed;
        setDropTarget(teamAtPoint(drag.x, drag.y));
      }
      frame = requestAnimationFrame(scroll);
    };
    frame = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(frame);
  }, [dragPreview]);

  const finishPointerDrag = (event, cancelled = false) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const target = cancelled ? null : teamAtPoint(event.clientX, event.clientY);
    if (drag.active && target !== null) assignMember(drag.member.id, target);
    else clearDrag();
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <section
      ref={containerRef}
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
              draggable={false}
              aria-pressed={selectedId === member.id}
              aria-describedby="assignment-help"
              className={`${styles.memberChip} ${selectedId === member.id ? styles.selected : ""}`}
              onClick={() => {
                if (suppressClick.current) {
                  suppressClick.current = false;
                  return;
                }
                setSelectedId(selectedId === member.id ? null : member.id);
              }}
              onDragStart={(event) => event.preventDefault()}
              onPointerDown={(event) => {
                if (event.button !== 0 || event.isPrimary === false) return;
                suppressClick.current = false;
                dragRef.current = {
                  member,
                  pointerId: event.pointerId,
                  startX: event.clientX,
                  startY: event.clientY,
                  x: event.clientX,
                  y: event.clientY,
                  active: false,
                };
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                const drag = dragRef.current;
                if (!drag || drag.pointerId !== event.pointerId) return;
                drag.x = event.clientX;
                drag.y = event.clientY;
                if (
                  !drag.active &&
                  Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < 6
                )
                  return;
                drag.active = true;
                suppressClick.current = true;
                setSelectedId(null);
                setDragPreview({ member: drag.member, x: drag.x, y: drag.y });
                setDropTarget(teamAtPoint(drag.x, drag.y));
              }}
              onPointerUp={finishPointerDrag}
              onPointerCancel={(event) => finishPointerDrag(event, true)}
              onLostPointerCapture={clearDrag}
              onKeyDown={(event) => {
                if (event.key === "Escape") clearDrag();
                if (event.key === "Enter" || event.key === " ")
                  suppressClick.current = false;
              }}
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

      {dragPreview && (
        <div
          className={styles.dragPreview}
          aria-hidden="true"
          style={{ left: dragPreview.x + 12, top: dragPreview.y + 12 }}
        >
          {dragPreview.member.name} · {dragPreview.member.position}
        </div>
      )}
      <div className={styles.grid}>
        {teams.map((team) => (
          <article
            key={team.projectId}
            className={`${styles.card} ${dropTarget === team.projectId ? styles.dropTarget : ""}`}
            aria-labelledby={`team-${team.projectId}`}
            data-team-id={team.projectId}
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
