import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cookies from "../utils/authStorage";
import { useNavigate } from "react-router-dom";
import { teamBuildApi } from "../api/team-build";
import { POSITIONS } from "../constants/positions";
import wapsLogo from "../assets/img/waps_logo.png";
import styles from "../assets/TeamBuildRecruit.module.css";

const createEmptyRankMap = () =>
  POSITIONS.reduce((acc, pos) => {
    acc[pos] = [];
    return acc;
  }, {});

const createEmptyCapacityMap = () =>
  POSITIONS.reduce((acc, pos) => {
    acc[pos] = "0";
    return acc;
  }, {});

const normalizeApplies = (applies) =>
  (applies || []).map((item) => ({
    applicantId: item.applicantId ?? item.applicant_id ?? item.id,
    applicantName: item.applicantName ?? item.name ?? "",
    position: item.position ?? "",
    comment: item.comment ?? "",
    career: item.career ?? "",
  }));

const formatApiError = (err, fallback) => {
  if (typeof err === "string") return err;
  if (err?.response?.data) {
    const data = err.response.data;
    if (typeof data === "string") return data;
    return data.message || data.error || fallback;
  }
  return err?.message || fallback;
};

function TeamBuildPage({ round = 1 }) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const loadRequestRef = useRef(0);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [applies, setApplies] = useState([]);
  const [rankedByPosition, setRankedByPosition] = useState(createEmptyRankMap);
  const [capacityByPosition, setCapacityByPosition] = useState(
    createEmptyCapacityMap,
  );
  const [currentFilter, setCurrentFilter] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");
  const [submitStatus, setSubmitStatus] = useState("");
  const [expandedApplicantIds, setExpandedApplicantIds] = useState(
    () => new Set(),
  );
  const [highlightedApplicantId, setHighlightedApplicantId] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOver, setDragOver] = useState({
    position: null,
    zone: null,
    index: null,
  });
  const filterRef = useRef(null);
  const dragStateRef = useRef({
    candidate: null,
    source: null,
    index: -1,
    position: null,
  });

  const userName = Cookies.get("userName") || "";

  useEffect(() => {
    const token =
      Cookies.get("authToken") ||
      "";
    if (!token) {
      alert("로그인이 필요합니다.");
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const countsByPosition = useMemo(() => {
    const counts = POSITIONS.reduce((acc, pos) => {
      acc[pos] = 0;
      return acc;
    }, {});
    for (const apply of applies) {
      if (counts[apply.position] !== undefined) {
        counts[apply.position] += 1;
      }
    }
    return counts;
  }, [applies]);

  const filteredApplies = useMemo(() => {
    return currentFilter
      ? applies.filter((a) => a.position === currentFilter)
      : applies;
  }, [applies, currentFilter]);

  const visiblePositions = useMemo(() => {
    return POSITIONS.filter((pos) => (countsByPosition[pos] || 0) > 0);
  }, [countsByPosition]);

  const availableByPosition = useMemo(() => {
    const result = POSITIONS.reduce((acc, pos) => {
      acc[pos] = [];
      return acc;
    }, {});
    const rankedIds = POSITIONS.reduce((acc, pos) => {
      acc[pos] = new Set(
        (rankedByPosition[pos] || []).map((c) => c.applicantId),
      );
      return acc;
    }, {});
    for (const apply of applies) {
      if (!result[apply.position]) continue;
      if (!rankedIds[apply.position].has(apply.applicantId)) {
        result[apply.position].push(apply);
      }
    }
    return result;
  }, [applies, rankedByPosition]);

  const totalApplicantsOf = (pos) => countsByPosition[pos] || 0;

  const handleLoad = useCallback(async (projectId) => {
    if (!projectId) return;
    const requestId = ++loadRequestRef.current;
    setIsLoading(true);
    setSubmitMsg("");
    setSubmitStatus("");
    try {
      const response = await teamBuildApi.getRecruitApplies(projectId, round);
      if (requestId !== loadRequestRef.current) return;
      if (response?.success === false) {
        throw new Error(response.message || "불러오기 실패");
      }

      const normalized = normalizeApplies(
        response?.applies || response?.data?.applies || [],
      );
      const rawTitle = response?.projectTitle;
      const safeTitle = rawTitle && rawTitle !== "null" ? rawTitle : "";
      setCurrentProjectId(projectId);
      setProjectTitle(safeTitle);
      setApplies(normalized);
      setRankedByPosition(createEmptyRankMap());
      setCapacityByPosition(createEmptyCapacityMap());
      setCurrentFilter("");
      setFilterOpen(false);
    } catch (err) {
      if (requestId !== loadRequestRef.current) return;
      setCurrentProjectId(null);
      setProjectTitle("");
      setApplies([]);
      setRankedByPosition(createEmptyRankMap());
      setCapacityByPosition(createEmptyCapacityMap());
      setCurrentFilter("");
      alert(formatApiError(err, "불러오기 실패"));
    } finally {
      if (requestId === loadRequestRef.current) setIsLoading(false);
    }
  }, [round]);

  useEffect(() => {
    if (!Cookies.get("authToken")) return;
    const requestRef = loadRequestRef;
    let active = true;
    setProjectsLoading(true);
    setProjectsError("");
    const loadProjects = async () => {
      try {
        const ownedProjects = await teamBuildApi.getRecruitProjects();
        if (!active) return;
        setProjects(ownedProjects);
        if (ownedProjects.length === 1) {
          setSelectedProjectId(String(ownedProjects[0].projectId));
          await handleLoad(ownedProjects[0].projectId);
        }
      } catch (err) {
        if (active) setProjectsError(formatApiError(err, "프로젝트 목록을 불러오지 못했습니다."));
      } finally {
        if (active) setProjectsLoading(false);
      }
    };
    loadProjects();
    return () => {
      active = false;
      requestRef.current++;
    };
  }, [handleLoad, retryCount]);

  const handleCapacityChange = (pos, value) => {
    if (value === "") {
      setCapacityByPosition((prev) => ({ ...prev, [pos]: "" }));
      return;
    }

    const digitsOnly = value.replace(/[^\d]/g, "");
    if (digitsOnly === "") {
      setCapacityByPosition((prev) => ({ ...prev, [pos]: "" }));
      return;
    }

    const normalized = digitsOnly.replace(/^0+(?=\d)/, "");
    const total = totalApplicantsOf(pos);
    let nextNum = Number(normalized);
    if (Number.isNaN(nextNum)) {
      setCapacityByPosition((prev) => ({ ...prev, [pos]: "" }));
      return;
    }
    if (nextNum > total) nextNum = total;
    if (nextNum < 0) nextNum = 0;
    setCapacityByPosition((prev) => ({ ...prev, [pos]: String(nextNum) }));
  };

  const handleDragStart = (candidate, source, index) => (event) => {
    dragStateRef.current = {
      candidate,
      source,
      index,
      position: candidate.position,
    };
    setDraggingId(candidate.applicantId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(candidate.applicantId));
  };

  const handleDragEnd = () => {
    dragStateRef.current = {
      candidate: null,
      source: null,
      index: -1,
      position: null,
    };
    setDraggingId(null);
    setDragOver({ position: null, zone: null, index: null });
  };

  const handleRankedDrop =
    (position, targetIndex = null) =>
    (event) => {
      event.preventDefault();
      if (targetIndex !== null) {
        event.stopPropagation();
      }
      setDragOver({ position: null, zone: null, index: null });

      const dragState = dragStateRef.current;
      if (!dragState.candidate || dragState.position !== position) return;

      const cap = Number(capacityByPosition[position] || 0);
      if (cap === 0) {
        alert(
          "capacity=0 상태에서는 해당 포지션에 우선순위를 설정할 수 없습니다.",
        );
        return;
      }

      setRankedByPosition((prev) => {
        const list = [...(prev[position] || [])];
        const existingIndex = list.findIndex(
          (c) => c.applicantId === dragState.candidate.applicantId,
        );

        if (existingIndex !== -1) {
          const [moved] = list.splice(existingIndex, 1);
          let insertIndex = targetIndex === null ? list.length : targetIndex;
          if (targetIndex !== null && targetIndex > existingIndex) {
            insertIndex -= 1;
          }
          list.splice(insertIndex, 0, moved);
        } else {
          const insertIndex = targetIndex === null ? list.length : targetIndex;
          list.splice(insertIndex, 0, dragState.candidate);
        }

        return { ...prev, [position]: list };
      });
    };

  const handleAvailableDrop = (position) => (event) => {
    event.preventDefault();
    setDragOver({ position: null, zone: null, index: null });

    const dragState = dragStateRef.current;
    if (!dragState.candidate || dragState.position !== position) return;

    setRankedByPosition((prev) => {
      const list = [...(prev[position] || [])];
      const existingIndex = list.findIndex(
        (c) => c.applicantId === dragState.candidate.applicantId,
      );
      if (existingIndex === -1) return prev;
      list.splice(existingIndex, 1);
      return { ...prev, [position]: list };
    });
  };

  const handleDragOverZone =
    (position, zone, index = null) =>
    (event) => {
      const dragState = dragStateRef.current;
      if (!dragState.candidate || dragState.position !== position) return;
      if (zone === "ranked" && Number(capacityByPosition[position] || 0) === 0)
        return;
      event.preventDefault();
      setDragOver({ position, zone, index });
    };

  const handleDragLeaveZone = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setDragOver({ position: null, zone: null, index: null });
    }
  };

  const handleSubmit = async () => {
    if (!currentProjectId) {
      alert("먼저 프로젝트를 불러오세요.");
      return;
    }

    const roasters = POSITIONS.map((pos) => {
      const ranked = rankedByPosition[pos] || [];
      let cap = Number(capacityByPosition[pos] || 0);
      const maxCap = ranked.length;
      if (cap < 0) cap = 0;
      if (cap > maxCap) cap = maxCap;

      const applicantIds = cap === 0 ? [] : ranked.map((c) => c.applicantId);
      return { position: pos, capacity: cap, applicantIds };
    });

    setIsSubmitting(true);
    setSubmitMsg("");
    setSubmitStatus("");
    try {
      const response = await teamBuildApi.submitRecruitPreference(
        {
          projectId: currentProjectId,
          roasters,
        },
        round,
      );
      const message =
        typeof response === "string"
          ? response
          : response?.message ||
            `[성공] 팀 구성이 완료되었습니다. projectId=${currentProjectId}`;
      setSubmitMsg(message);
      setSubmitStatus("ok");
      setTimeout(() => navigate(-1), 800);
    } catch (err) {
      setSubmitMsg(`[실패] ${formatApiError(err, "등록 실패")}`);
      setSubmitStatus("err");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPositionBadge = (pos) => {
    const colorClass = pos ? styles[`positionBadge${pos}`] : "";
    const className = colorClass || styles.tagMuted;
    return (
      <span className={`${styles.positionBadge} ${className}`}>
        {pos || "전체"}
      </span>
    );
  };

  const emptyApplyMessage = currentProjectId
    ? currentFilter
      ? `${currentFilter} 분야에 신청자가 없습니다.`
      : "신청자가 없습니다."
    : "프로젝트를 불러오세요. 신청자 목록이 나타납니다.";

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topBar}>
          <div className={styles.brand}>
            <img src={wapsLogo} alt="WAPs" className={styles.brandLogo} />
          </div>
          <div className={styles.topActions}>
            {userName && <span className={styles.userName}>{userName} 님</span>}
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => navigate(-1)}
            >
              &times;
            </button>
          </div>
        </div>

        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>
            RECRUITMENT PAGE_{round === 2 ? "2nd" : "1st"}
          </h1>
          <div className={styles.heroSubtitle}>{round}차 모집하기 페이지</div>
        </div>

        <div className={styles.card}>
          <div className={styles.sectionTitle}>내 프로젝트</div>
          <div className={styles.sectionCaption}>
            현재 학기에 본인이 등록한 프로젝트의 신청자를 확인하세요.
          </div>

          {projectsLoading && <p role="status">프로젝트를 불러오는 중...</p>}
          {projectsError && <div role="alert">{projectsError}
            <button type="button" className={styles.primaryButton}
              onClick={() => setRetryCount(count => count + 1)}>다시 시도</button>
          </div>}
          {!projectsLoading && !projectsError && projects.length === 0 && (
            <p className={styles.muted}>현재 학기에 등록한 프로젝트가 없습니다.</p>
          )}
          {projects.length > 0 && (
          <div className={styles.projectRow}>
            {projects.length === 1 ? <span>{projects[0].title}</span> : <select
              aria-label="모집할 프로젝트"
              className={`${styles.inputField} ${styles.projectIdInput}`}
              value={selectedProjectId}
              disabled={isLoading || isSubmitting || projectsLoading}
              onChange={(event) => {
                setSelectedProjectId(event.target.value);
                setCurrentProjectId(null);
                setProjectTitle("");
                setApplies([]);
                setRankedByPosition(createEmptyRankMap());
                setCapacityByPosition(createEmptyCapacityMap());
                setSubmitMsg("");
              }}
            >
              <option value="">프로젝트를 선택하세요</option>
              {projects.map(project => <option key={project.projectId} value={project.projectId}>{project.title}</option>)}
            </select>}
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => handleLoad(Number(selectedProjectId))}
              disabled={isLoading || isSubmitting || projectsLoading || !selectedProjectId}
            >
              {isLoading ? "불러오는 중" : "불러오기"}
            </button>
          </div>
          )}
          {projectTitle && <div className={styles.muted}>· {projectTitle}</div>}

          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionTitle}>신청자 목록</div>
              <div className={styles.sectionCaption}>
                본인의 팀에 지원한 신청자들의 목록입니다.
              </div>
            </div>
            <div className={styles.filterWrap} ref={filterRef}>
              <span className={styles.filterLabel}>분야별 필터</span>
              <div className={styles.filterDropdown}>
                <button
                  type="button"
                  className={styles.filterButton}
                  onClick={() => setFilterOpen((prev) => !prev)}
                >
                  <span className={styles.filterButtonContent}>
                    {currentFilter ? (
                      renderPositionBadge(currentFilter)
                    ) : (
                      <span className={styles.filterAllText}>전체보기</span>
                    )}
                  </span>
                  <span className={styles.filterArrow}>▼</span>
                </button>
                {filterOpen && (
                  <div className={styles.filterMenu}>
                    <button
                      type="button"
                      className={`${styles.filterItem} ${!currentFilter ? styles.filterItemActive : ""}`}
                      onClick={() => {
                        setCurrentFilter("");
                        setFilterOpen(false);
                      }}
                    >
                      <span className={styles.filterAllText}>전체보기</span>
                    </button>
                    {POSITIONS.map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        className={`${styles.filterItem} ${
                          currentFilter === pos ? styles.filterItemActive : ""
                        }`}
                        onClick={() => {
                          setCurrentFilter(pos);
                          setFilterOpen(false);
                        }}
                      >
                        {renderPositionBadge(pos)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>이름</th>
                  <th>분야</th>
                  <th>경력</th>
                  <th>한줄 PR</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplies.length === 0 ? (
                  <tr>
                    <td colSpan="4" className={styles.muted}>
                      {emptyApplyMessage}
                    </td>
                  </tr>
                ) : (
                  filteredApplies.map((apply) => (
                    <tr
                      key={apply.applicantId}
                      className={
                        highlightedApplicantId === apply.applicantId
                          ? styles.rowHighlight
                          : ""
                      }
                    >
                      <td className={styles.applicantNameCell}>
                        {apply.applicantName || "-"}
                      </td>
                      <td className={styles.positionCell}>
                        {renderPositionBadge(apply.position)}
                      </td>
                      <td className={styles.careerCell}>
                        {apply.career || "작성된 경력이 없습니다."}
                      </td>
                      <td className={styles.applicationTextCell}>
                        {apply.comment || "작성된 한줄 PR이 없습니다."}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.mobileList}>
            {filteredApplies.length === 0 ? (
              <div className={styles.muted}>{emptyApplyMessage}</div>
            ) : (
              filteredApplies.map((apply) => {
                const isExpanded = expandedApplicantIds.has(apply.applicantId);
                return (
                  <div
                    key={apply.applicantId}
                    className={`${styles.applicantCard} ${isExpanded ? styles.applicantCardExpanded : ""}`}
                    onMouseEnter={() =>
                      setHighlightedApplicantId(apply.applicantId)
                    }
                    onMouseLeave={() => setHighlightedApplicantId(null)}
                  >
                    <div className={styles.cardHeaderRow}>
                      <span className={styles.cardName}>
                        {apply.applicantName || "-"}
                      </span>
                      {renderPositionBadge(apply.position)}
                      <button
                        type="button"
                        className={`${styles.applicationArrow} ${
                          isExpanded ? styles.applicationArrowExpanded : ""
                        }`}
                        aria-label={`${apply.applicantName || "지원자"} 지원서 ${
                          isExpanded ? "닫기" : "보기"
                        }`}
                        aria-expanded={isExpanded}
                        onClick={() =>
                          setExpandedApplicantIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(apply.applicantId))
                              next.delete(apply.applicantId);
                            else next.add(apply.applicantId);
                            return next;
                          })
                        }
                      >
                        &rsaquo;
                      </button>
                    </div>
                    {isExpanded && (
                      <div className={styles.applicationContent}>
                        {apply.career && (
                          <>
                            경력: {apply.career}
                            <br />
                          </>
                        )}
                        {apply.comment || "작성된 지원서 내용이 없습니다."}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className={styles.instructionBox}>
            <div className={styles.sectionTitle}>선발입력</div>
            <div className={styles.sectionCaption}>
              드래그 앤 드롭으로 지원자를 선택하고 우선순위를 변경하세요.
            </div>
            <ul className={styles.instructionList}>
              <li>
                1. 모집을 희망하는 분야에 원하는 인원만큼 capacity를 입력하세요.
              </li>
              <li>
                2. 지원자를 드래그하여 우선순위를 정해주세요. (1순위부터 마지막
                순위까지)
              </li>
              <li>3. capacity가 0이면 우선순위를 설정할 수 없습니다.</li>
              {round === 1 && (
                <li>
                  4. 최소 3명의 우선순위를 지정해야 합니다. 지원자가 3명 미만이면
                  모두 선택해야 합니다.
                </li>
              )}
            </ul>
          </div>

          <div className={styles.positions}>
            {visiblePositions.length === 0 ? (
              <div className={styles.muted}>지원자가 없습니다.</div>
            ) : (
              visiblePositions.map((pos) => {
                const ranked = rankedByPosition[pos] || [];
                const available = availableByPosition[pos] || [];
                const capValue = capacityByPosition[pos];
                const cap = Number(capValue || 0);
                const maxCap = totalApplicantsOf(pos);
                const rankedDragOver =
                  dragOver.position === pos && dragOver.zone === "ranked";
                const availableDragOver =
                  dragOver.position === pos && dragOver.zone === "available";

                return (
                  <div key={pos} className={styles.positionRow}>
                    <div className={styles.positionMeta}>
                      <div className={styles.positionName}>{pos}</div>
                      <div className={styles.capacityBox}>
                        <div className={styles.capacityPill}>
                          <input
                            className={styles.capacityInput}
                            type="number"
                            min="0"
                            max={maxCap}
                            step="1"
                            value={
                              capValue === undefined || capValue === null
                                ? ""
                                : capValue
                            }
                            onChange={(event) =>
                              handleCapacityChange(pos, event.target.value)
                            }
                            onFocus={(event) => {
                              if (event.target.value === "0") {
                                event.target.select();
                              }
                            }}
                            onBlur={(event) => {
                              if (event.target.value === "") {
                                setCapacityByPosition((prev) => ({
                                  ...prev,
                                  [pos]: "0",
                                }));
                                return;
                              }
                              const nextNum = Number(event.target.value);
                              if (Number.isNaN(nextNum)) {
                                setCapacityByPosition((prev) => ({
                                  ...prev,
                                  [pos]: "0",
                                }));
                                return;
                              }
                              const clamped = Math.min(
                                Math.max(nextNum, 0),
                                maxCap,
                              );
                              setCapacityByPosition((prev) => ({
                                ...prev,
                                [pos]: String(clamped),
                              }));
                            }}
                          />
                        </div>
                        <span className={styles.capacityLabel}>Capacity</span>
                      </div>
                    </div>
                    <div className={styles.rankArea}>
                      <div className={styles.rankLabel}>
                        선택된 지원자(우선 순위)
                      </div>
                      <div
                        className={`${styles.dropZone} ${rankedDragOver ? styles.dragOver : ""} ${
                          cap === 0 ? styles.locked : ""
                        }`}
                        onDragOver={handleDragOverZone(pos, "ranked")}
                        onDragEnter={handleDragOverZone(pos, "ranked")}
                        onDragLeave={handleDragLeaveZone}
                        onDrop={handleRankedDrop(pos)}
                      >
                        {ranked.length === 0 ? (
                          <span className={styles.emptyText}>
                            여기에 지원자를 드래그해 넣으세요.
                          </span>
                        ) : (
                          ranked.map((candidate, index) => (
                            <span
                              key={candidate.applicantId}
                              className={`${styles.pill} ${styles.pillRanked} ${
                                draggingId === candidate.applicantId
                                  ? styles.pillDragging
                                  : ""
                              } ${
                                dragOver.position === pos &&
                                dragOver.zone === "ranked" &&
                                dragOver.index === index
                                  ? styles.pillDragOver
                                  : ""
                              }`}
                              data-priority={index + 1}
                              draggable
                              onDragStart={handleDragStart(
                                candidate,
                                "ranked",
                                index,
                              )}
                              onDragEnd={handleDragEnd}
                              onDragOver={handleDragOverZone(
                                pos,
                                "ranked",
                                index,
                              )}
                              onDragEnter={handleDragOverZone(
                                pos,
                                "ranked",
                                index,
                              )}
                              onDragLeave={handleDragLeaveZone}
                              onDrop={handleRankedDrop(pos, index)}
                              onMouseEnter={() =>
                                setHighlightedApplicantId(candidate.applicantId)
                              }
                              onMouseLeave={() =>
                                setHighlightedApplicantId(null)
                              }
                            >
                              {candidate.applicantName}
                            </span>
                          ))
                        )}
                      </div>

                      <div className={styles.rankLabel}>사용 가능한 지원자</div>
                      <div
                        className={`${styles.dropZone} ${availableDragOver ? styles.dragOver : ""}`}
                        onDragOver={handleDragOverZone(pos, "available")}
                        onDragEnter={handleDragOverZone(pos, "available")}
                        onDragLeave={handleDragLeaveZone}
                        onDrop={handleAvailableDrop(pos)}
                      >
                        {available.length === 0 ? (
                          <span className={styles.emptyText}>신청자 없음</span>
                        ) : (
                          available.map((candidate) => (
                            <span
                              key={candidate.applicantId}
                              className={`${styles.pill} ${
                                draggingId === candidate.applicantId
                                  ? styles.pillDragging
                                  : ""
                              }`}
                              draggable
                              onDragStart={handleDragStart(
                                candidate,
                                "available",
                                -1,
                              )}
                              onDragEnd={handleDragEnd}
                              onMouseEnter={() =>
                                setHighlightedApplicantId(candidate.applicantId)
                              }
                              onMouseLeave={() =>
                                setHighlightedApplicantId(null)
                              }
                            >
                              {candidate.applicantName}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className={styles.submitRow}>
            <button
              type="button"
              className={styles.submitButton}
              onClick={handleSubmit}
              disabled={isSubmitting || isLoading || projectsLoading || !currentProjectId}
            >
              {isSubmitting ? "제출 중..." : "희망 팀 제출하기"}
            </button>
            {submitMsg && (
              <span
                className={
                  submitStatus === "ok" ? styles.statusOk : styles.statusErr
                }
              >
                {submitMsg}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeamBuildPage;
