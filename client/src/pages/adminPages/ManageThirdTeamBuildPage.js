import { useEffect, useRef, useState } from "react";
import styles from "../../assets/Admin/ManageThirdTeamBuild.module.css";
import { thirdRoundApi } from "../../api/third-round";

const memberLabel = (member) =>
  member.name ? `${member.name}(${member.position})` : member.position;

const ManageThirdTeamBuildPage = () => {
  const [{ teams, unassigned, revision, completed }, setRoster] = useState({
    teams: [],
    unassigned: [],
    revision: null,
    completed: false,
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const requestInFlight = useRef(false);
  const mounted = useRef(false);
  const busy = loading || saving || completed;

  useEffect(() => {
    let cancelled = false;
    mounted.current = true;
    thirdRoundApi
      .open()
      .then((board) => {
        if (!cancelled) setRoster(board);
      })
      .catch((failure) => {
        if (!cancelled)
          setError(
            failure.response?.data?.message || "배치안을 불러오지 못했습니다.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      mounted.current = false;
    };
  }, []);

  const reload = async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setLoading(true);
    setError("");
    setSelectedId(null);
    clearDrag();
    try {
      const board = await thirdRoundApi.open();
      if (mounted.current) setRoster(board);
    } catch (failure) {
      if (mounted.current)
        setError(
          failure.response?.data?.message || "배치안을 불러오지 못했습니다.",
        );
    } finally {
      requestInFlight.current = false;
      if (mounted.current) setLoading(false);
    }
  };

  const mutate = async (request, successMessage) => {
    if (busy || requestInFlight.current || revision === null) return;
    requestInFlight.current = true;
    setSaving(true);
    setError("");
    setSelectedId(null);
    clearDrag();
    try {
      const board = await request();
      if (mounted.current) {
        setRoster(board);
        setMessage(successMessage);
      }
    } catch (failure) {
      if (mounted.current) {
        setMessage("");
        setError(
          failure.response?.data?.message ||
            "변경 내용을 저장하지 못했습니다. 새로고침으로 저장 상태를 확인해 주세요.",
        );
      }
      // A stale revision must not overwrite a different administrator's update.
      if (failure.response?.status === 409) {
        try {
          const board = await thirdRoundApi.get();
          if (mounted.current) setRoster(board);
        } catch {
          /* Keep the last confirmed board and offer reload. */
        }
      }
    } finally {
      requestInFlight.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  const [selectedId, setSelectedId] = useState(null);
  const dragRef = useRef(null);
  const containerRef = useRef(null);
  const suppressClick = useRef(false);
  const [dragPreview, setDragPreview] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const selectedMember = [
    ...unassigned,
    ...teams.flatMap((team) => team.members),
  ].find(
    (member) => member.id === selectedId && member.type === "POSITION_SLOT",
  );
  const canUnassign =
    selectedMember &&
    teams.some((team) =>
      team.members.some((member) => member.id === selectedMember.id),
    );
  const assignedMemberCount = teams.reduce(
    (total, team) => total + team.members.length,
    0,
  );

  const clearDrag = () => {
    dragRef.current = null;
    setDragPreview(null);
    setDropTarget(null);
  };

  const createTeam = () =>
    mutate(
      () => thirdRoundApi.create(revision),
      "빈 팀을 생성했습니다. 직무 인원을 배치해 주세요.",
    );

  const completeTeamBuild = () =>
    mutate(
      () => thirdRoundApi.complete(revision),
      "팀 빌딩을 완료했습니다. 팀빌딩 결과에 반영되었습니다.",
    );

  const shuffleMembers = () =>
    mutate(
      () => thirdRoundApi.shuffle(revision),
      "같은 직무 지원자를 셔플하고 저장했습니다.",
    );

  const deleteTeam = (teamId) => {
    const team = teams.find((item) => item.id === teamId);
    if (!team?.isCreated) return;
    mutate(
      () => thirdRoundApi.delete(teamId, revision),
      team.members.length
        ? `${team.teamName}을 삭제하고 직무 인원 ${team.members.length}명을 미배정 목록으로 옮겼습니다.`
        : `${team.teamName}을 삭제했습니다.`,
    );
  };

  const assignMember = (memberId, teamId) => {
    const source = teams.find((team) =>
      team.members.some((member) => member.id === memberId),
    );
    const member =
      unassigned.find((item) => item.id === memberId) ||
      source?.members.find((item) => item.id === memberId);
    const target = teams.find((team) => team.id === teamId);
    if (
      !member ||
      member.type !== "POSITION_SLOT" ||
      (teamId !== null && !target) ||
      (teamId === null ? !source : source === target)
    ) {
      setSelectedId(null);
      clearDrag();
      return;
    }
    mutate(
      () => thirdRoundApi.move(memberId, teamId, revision),
      teamId === null
        ? `${memberLabel(member)}을 미배정 목록으로 옮겼습니다.`
        : source
          ? `${member.position} 인원 1명을 ${source.teamName} 팀에서 ${target.teamName} 팀으로 이동했습니다.`
          : `${target.teamName} 팀에 ${member.position} 인원 1명을 배치했습니다.`,
    );
  };

  const destinationAtPoint = (x, y) => {
    const card = document
      .elementFromPoint(x, y)
      ?.closest("[data-team-id], [data-unassigned]");
    return card && containerRef.current?.contains(card)
      ? card.hasAttribute("data-unassigned")
        ? "unassigned"
        : Number(card.dataset.teamId)
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
        setDropTarget(destinationAtPoint(drag.x, drag.y));
      }
      frame = requestAnimationFrame(scroll);
    };
    frame = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(frame);
  }, [dragPreview]);

  const finishPointerDrag = (event, cancelled = false) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const target = cancelled
      ? null
      : destinationAtPoint(event.clientX, event.clientY);
    if (drag.active && target !== null)
      assignMember(drag.member.id, target === "unassigned" ? null : target);
    else clearDrag();
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const renderPositionSlot = (member) => (
    <button
      key={member.id}
      type="button"
      disabled={busy}
      draggable={false}
      aria-pressed={selectedId === member.id}
      aria-describedby="assignment-help"
      className={`${styles.memberChip} ${selectedId === member.id ? styles.selected : ""}`}
      onClick={(event) => {
        event.stopPropagation();
        if (suppressClick.current) {
          suppressClick.current = false;
          return;
        }
        setSelectedId(selectedId === member.id ? null : member.id);
      }}
      onDragStart={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        if (
          busy ||
          requestInFlight.current ||
          event.button !== 0 ||
          event.isPrimary === false
        )
          return;
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
        setDropTarget(destinationAtPoint(drag.x, drag.y));
      }}
      onPointerUp={finishPointerDrag}
      onPointerCancel={(event) => finishPointerDrag(event, true)}
      onLostPointerCapture={clearDrag}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") clearDrag();
        if (event.key === "Enter" || event.key === " ")
          suppressClick.current = false;
      }}
    >
      <span className={styles.position}>{memberLabel(member)}</span>
    </button>
  );

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
          {completed
            ? "팀 빌딩이 완료되었습니다."
            : "배치안은 자동 저장됩니다. 팀 빌딩 완료를 누르면 현재 배치가 결과에 반영되며 이후 수정할 수 없습니다."}
          {completed && <a href="/team-build/result">팀빌딩 결과 보기</a>}
        </p>
      </header>

      <div className={styles.syncControls}>
        <button
          type="button"
          className={styles.refreshButton}
          onClick={reload}
          disabled={busy}
        >
          새로고침
        </button>
        {loading && <span>배치안을 불러오는 중입니다.</span>}
        {saving && <span>저장 중입니다.</span>}
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

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

      <div className={styles.createTeamControls}>
        <button
          type="button"
          className={styles.createTeamButton}
          onClick={createTeam}
          disabled={busy || revision === null}
        >
          팀 생성
        </button>
        <button
          type="button"
          className={styles.createTeamButton}
          onClick={shuffleMembers}
          disabled={busy || revision === null}
          aria-describedby="shuffle-help"
        >
          셔플
        </button>
        <button
          type="button"
          className={styles.createTeamButton}
          onClick={completeTeamBuild}
          disabled={busy || revision === null}
        >
          팀 빌딩 완료
        </button>
        <p id="shuffle-help" className={styles.description}>
          같은 직무 지원자를 미배정 목록과 팀 사이에서 무작위로 섞습니다. 팀별
          직무 인원수는 유지되며, 결과가 기존 배치와 같을 수도 있습니다.
        </p>
      </div>

      <section
        className={`${styles.unassigned} ${canUnassign ? styles.assignable : ""} ${dropTarget === "unassigned" ? styles.dropTarget : ""}`}
        aria-labelledby="unassigned-title"
        data-unassigned="true"
        role={canUnassign ? "button" : undefined}
        tabIndex={canUnassign ? 0 : undefined}
        aria-describedby={canUnassign ? "assignment-help" : undefined}
        onClick={() => {
          if (canUnassign) assignMember(selectedMember.id, null);
        }}
        onKeyDown={(event) => {
          if (!canUnassign) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            assignMember(selectedMember.id, null);
          }
          if (event.key === "Escape") setSelectedId(null);
        }}
      >
        <h2 id="unassigned-title" className={styles.teamName}>
          미배정 멤버
        </h2>
        <p id="assignment-help" className={styles.description}>
          지원자를 팀 카드로 드래그하거나 선택 후 팀 카드를 클릭하세요. 각
          항목은 지원자의 이름과 주요 직무를 나타냅니다. 배치한 지원자도 같은
          방법으로 다른 팀이나 미배정 멤버 섹션으로 이동할 수 있습니다.
        </p>
        <div className={styles.unassignedList}>
          {unassigned.map((member) => renderPositionSlot(member))}
        </div>
        {!loading && revision !== null && unassigned.length === 0 && (
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
          {memberLabel(dragPreview.member)}
        </div>
      )}
      <div className={styles.grid}>
        {teams.map((team) => (
          <article
            key={team.id}
            className={`${styles.card} ${selectedMember ? styles.assignable : ""} ${dropTarget === team.id ? styles.dropTarget : ""}`}
            aria-labelledby={`team-${team.id}`}
            data-team-id={team.id}
            role={selectedMember ? "button" : undefined}
            tabIndex={selectedMember ? 0 : undefined}
            aria-describedby={selectedMember ? "assignment-help" : undefined}
            onClick={() => {
              if (selectedMember) assignMember(selectedMember.id, team.id);
            }}
            onKeyDown={(event) => {
              if (!selectedMember) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                assignMember(selectedMember.id, team.id);
              }
              if (event.key === "Escape") setSelectedId(null);
            }}
          >
            <div className={styles.cardHeader}>
              <h2 id={`team-${team.id}`} className={styles.teamName}>
                {team.teamName}
              </h2>
              <span className={styles.badge}>
                배정 완료 {team.members.length}명
              </span>
              {team.isCreated && (
                <button
                  type="button"
                  className={styles.deleteTeamButton}
                  disabled={busy}
                  aria-label={`${team.teamName} 삭제`}
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteTeam(team.id);
                  }}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  삭제
                </button>
              )}
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
                      {member.type === "POSITION_SLOT" ? (
                        <td colSpan={2}>{renderPositionSlot(member)}</td>
                      ) : (
                        <>
                          <td>
                            <span className={styles.position}>
                              {member.position}
                            </span>
                          </td>
                          <td>{member.name}</td>
                        </>
                      )}
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
