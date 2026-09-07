import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import { teamBuildApi } from "../api/team-build";
import LoadingPage from "../components/LoadingPage";
import wapsLogo from "../assets/img/waps_logo.png";
import styles from "../assets/TeamBuildApply.module.css";
import noticeIcon from "../assets/img/noticeIcon.svg";
import noticeArrow from "../assets/img/noticeArrow.svg";
import emptyFolder from "../assets/img/folder.svg";

const MAX_SELECTION = 5;
const POSITION_OPTIONS = [
  { value: "FRONTEND", label: "프론트엔드" },
  { value: "BACKEND", label: "백엔드" },
  { value: "AI", label: "AI" },
  { value: "DESIGN", label: "디자이너" },
  { value: "APP", label: "앱" },
  { value: "GAME", label: "게임" },
  { value: "EMBEDDED", label: "임베디드" },
];

const PRIMARY_POSITION_OPTIONS = [
  { value: "BACKEND", label: "백엔드" },
  { value: "FRONTEND", label: "프론트엔드" },
  { value: "DESIGN", label: "디자이너" },
  { value: "GAME", label: "게임" },
  { value: "APP", label: "앱" },
  { value: "EMBEDDED", label: "임베디드" },
  { value: "AI", label: "AI" },
  { value: "OTHER", label: "기타" },
];

const POSITION_LABELS = POSITION_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

const readProjectType = (project) => project?.projectType || "";

const normalizeProjectType = (projectType) => {
  const raw = String(projectType || "").trim();
  const lower = raw.toLowerCase();

  if (lower === "web") return "WEB";
  if (lower === "app") return "APP";
  if (lower === "game") return "GAME";
  if (lower === "embedded" || lower === "etc" || lower === "기타")
    return "EMBEDDED";
  return raw.toUpperCase();
};

const getProjectTeamType = (projectType) => {
  const raw = String(projectType || "").trim();
  const lower = raw.toLowerCase();

  if (lower === "기타" || lower === "etc") return "OTHER";
  return normalizeProjectType(raw) || "OTHER";
};

const getProjectTeamTypeLabel = (projectType) => {
  const type = getProjectTeamType(projectType);
  return type === "OTHER" ? "기타" : type;
};

const formatApiError = (err, fallback) => {
  if (typeof err === "string") return err;
  if (err?.response?.data) {
    const data = err.response.data;
    if (typeof data === "string") return data;
    return data.message || data.error || fallback;
  }
  return err?.message || fallback;
};

const reorderProjectIds = (
  projectIds,
  movingId,
  targetId,
  placement = "before",
) => {
  const next = [...projectIds];
  const fromIndex = next.indexOf(movingId);
  const targetIndex = next.indexOf(targetId);
  if (fromIndex === -1 || targetIndex === -1) return projectIds;
  if (fromIndex === targetIndex) return projectIds;

  next.splice(fromIndex, 1);

  let insertIndex = targetIndex;
  if (fromIndex < targetIndex) {
    insertIndex -= 1;
  }
  if (placement === "after") {
    insertIndex += 1;
  }

  next.splice(insertIndex, 0, movingId);
  return next;
};

function TeamBuildApplyPage({ round = 1 }) {
  const isSecondRound = round === 2;
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [hasApplied, setHasApplied] = useState(false);
  const [projects, setProjects] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);
  const [projectApplications, setProjectApplications] = useState([]);
  const [applicationModal, setApplicationModal] = useState(null);
  const [projectFormPosition, setProjectFormPosition] = useState("");
  const [defaultCareer, setDefaultCareer] = useState("");
  const [projectFormCareer, setProjectFormCareer] = useState("");
  const [projectFormMessage, setProjectFormMessage] = useState("");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [applicationDraggingId, setApplicationDraggingId] = useState(null);
  const [applicationDragOverId, setApplicationDragOverId] = useState(null);
  const [applicationDragOverPlacement, setApplicationDragOverPlacement] =
    useState("before");
  const [primaryPosition, setPrimaryPosition] = useState("");

  useEffect(() => {
    const token =
      Cookies.get("authToken") ||
      window.localStorage.getItem("authToken") ||
      "";
    if (!token) {
      alert("로그인이 필요합니다.");
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      const token =
        Cookies.get("authToken") ||
        window.localStorage.getItem("authToken") ||
        "";
      if (!token) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setLoadError("");
      try {
        const status = await teamBuildApi.getApplyStatus();
        if (!active) return;
        const applied = Boolean(status?.hasApplied);
        setHasApplied(applied);

        if (!applied) {
          const projectList = await teamBuildApi.getApplyProjects();
          if (!active) return;
          setProjects(Array.isArray(projectList) ? projectList : []);
        }
      } catch (err) {
        if (!active) return;
        setLoadError(
          formatApiError(err, "프로젝트 목록을 불러오지 못했습니다."),
        );
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, []);

  const getPositionLabel = (value) => POSITION_LABELS[value] || value;
  const getPrimaryPositionLabel = (value) =>
    PRIMARY_POSITION_OPTIONS.find((option) => option.value === value)?.label ||
    "미선택";

  const getProjectTeamLabel = (project) => {
    const projectType = getProjectTeamType(readProjectType(project));
    const teamNumber =
      projects
        .filter(
          (item) => getProjectTeamType(readProjectType(item)) === projectType,
        )
        .findIndex(
          (item) => String(item.projectId) === String(project.projectId),
        ) + 1;

    return `${getProjectTeamTypeLabel(readProjectType(project))} ${teamNumber || 1}`;
  };

  const openProjectApplication = (project, application = null) => {
    if (!application && projectApplications.length >= MAX_SELECTION) {
      alert(`지원서는 최대 ${MAX_SELECTION}개까지 작성할 수 있습니다.`);
      return;
    }
    setApplicationModal({ project, application });
    setProjectFormPosition(application?.position || "");
    setProjectFormCareer(application?.career ?? defaultCareer);
    setProjectFormMessage(application?.message || "");
  };

  const closeProjectApplication = () => {
    setApplicationModal(null);
    setProjectFormCareer("");
    setProjectFormPosition("");
    setProjectFormMessage("");
  };

  const saveProjectApplication = () => {
    if (!projectFormPosition) {
      alert("지원 직무를 선택해주세요.");
      return;
    }
    if (!projectFormMessage.trim()) {
      alert("자기소개 및 PR 메시지를 작성해주세요.");
      return;
    }

    if (projectFormMessage.length > 60) {
      alert("간단 자기소개 및 PR 메시지는 60자까지 작성할 수 있습니다.");
      return;
    }

    const { project, application } = applicationModal;
    const isDuplicate = projectApplications.some(
      (item) =>
        item.projectId === project.projectId &&
        item.position === projectFormPosition &&
        item.id !== application?.id,
    );
    if (isDuplicate) {
      alert("이미 이 프로젝트의 같은 직무에 지원했습니다.");
      return;
    }

    if (application) {
      setProjectApplications((prev) =>
        prev.map((item) =>
          item.id === application.id
            ? {
                ...item,
                position: projectFormPosition,
                career: projectFormCareer.trim(),
                message: projectFormMessage.trim(),
              }
            : item,
        ),
      );
    } else {
      setProjectApplications((prev) => [
        ...prev,
        {
          id: `${project.projectId}-${Date.now()}`,
          projectId: project.projectId,
          projectTitle: project.title,
          position: projectFormPosition,
          career: projectFormCareer.trim(),
          message: projectFormMessage.trim(),
        },
      ]);
    }
    setDefaultCareer(projectFormCareer.trim());
    closeProjectApplication();
  };

  const cancelProjectApplication = () => {
    if (!cancelTarget) return;
    setProjectApplications((prev) =>
      prev.filter((item) => item.id !== cancelTarget.id),
    );
    setCancelTarget(null);
  };

  const handleApplicationDragStart = (applicationId) => (event) => {
    setApplicationDraggingId(applicationId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(applicationId));
  };

  const handleApplicationDragOver = (applicationId) => (event) => {
    if (!applicationDraggingId || applicationDraggingId === applicationId)
      return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const rect = event.currentTarget.getBoundingClientRect();
    setApplicationDragOverPlacement(
      event.clientY - rect.top > rect.height / 2 ? "after" : "before",
    );
    setApplicationDragOverId(applicationId);
  };

  const handleApplicationDrop = (targetId) => (event) => {
    event.preventDefault();
    if (!applicationDraggingId || applicationDraggingId === targetId) return;

    setProjectApplications((prev) => {
      const applicationById = new Map(
        prev.map((application) => [application.id, application]),
      );
      return reorderProjectIds(
        prev.map((application) => application.id),
        applicationDraggingId,
        targetId,
        applicationDragOverPlacement,
      ).map((id) => applicationById.get(id));
    });
    setApplicationDragOverId(null);
    setApplicationDragOverPlacement("before");
  };

  const handleApplicationDragEnd = () => {
    setApplicationDraggingId(null);
    setApplicationDragOverId(null);
    setApplicationDragOverPlacement("before");
  };

  const submitProjectApplications = async () => {
    if (projectApplications.length < 3) return;
    if (!isSecondRound && !primaryPosition) {
      alert("주요 직무를 선택해주세요.");
      return;
    }

    setIsSubmitConfirmOpen(true);
  };

  const confirmProjectApplications = async () => {
    if (
      projectApplications.length < 3 ||
      (!isSecondRound && !primaryPosition) ||
      isSubmitting
    )
      return;

    const applies = projectApplications.map((application) => ({
      projectId: application.projectId,
      position: application.position,
      comment: application.message,
      career: application.career,
    }));

    setIsSubmitting(true);
    try {
      await teamBuildApi.submitApply({ applies }, round);
      setIsSubmitConfirmOpen(false);
      setHasApplied(true);
    } catch (err) {
      alert(formatApiError(err, "지원서 제출 중 오류가 발생했습니다."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  if (loadError) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.errorCard}>
            <div className={styles.errorTitle}>불러오기 실패</div>
            <div className={styles.errorMessage}>{loadError}</div>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => window.location.reload()}
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (hasApplied) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <section className={`${styles.myApply} ${styles.completedApply}`}>
            <div className={styles.myApplyHeader}>
              <div className={styles.myApplyTitle}>
                <div className={styles.myApplyTitleRow}>
                  <h2>지원이 완료되었습니다.</h2>
                  <div
                    className={`${styles.myApplyCount} ${styles.myApplyCountActive}`}
                    aria-label={`제출한 지원서 ${projectApplications.length}개`}
                  >
                    {projectApplications.length}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.myApplicationList}>
              {projectApplications.map((application, index) => (
                <div key={application.id} className={styles.myApplicationItem}>
                  <div
                    className={`${styles.priorityNumber} ${styles.myApplicationPriorityNumber}`}
                  >
                    {index + 1}
                  </div>
                  <div className={styles.myApplicationName}>
                    <strong>{application.projectTitle}</strong>
                    <span>·</span>
                    <span>{getPositionLabel(application.position)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topBar}>
          <div className={styles.brand}>
            <img src={wapsLogo} alt="WAPs" className={styles.brandLogo} />
            <span className={styles.brandText}>WAPs</span>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={() => navigate(-1)}
          >
            ×
          </button>
        </div>

        <div className={styles.hero}>
          <div className={styles.heroTitle}>
            TEAM BUILDING_{isSecondRound ? "2ND" : "1ST"}
          </div>
          <div className={styles.heroSubtitle}>
            함께할 팀을 찾고, 원하는 프로젝트에 도전해보세요
          </div>
        </div>

        <div
          className={`${styles.notice} ${isSecondRound ? styles.secondRoundNotice : ""}`}
        >
          <button
            type="button"
            className={styles.noticeButton}
            onClick={() => setIsNoticeOpen(!isNoticeOpen)}
            aria-expanded={isNoticeOpen}
            aria-controls="notice-content"
          >
            <div className={styles.noticeTitle}>
              <img src={noticeIcon} alt="" className={styles.noticeIcon} />
              <span>
                {isSecondRound ? "2차 팀빌딩 안내사항" : "팀빌딩 안내사항"}
              </span>
            </div>

            <span
              className={`${styles.noticeArrow} ${
                isNoticeOpen ? styles.noticeArrowOpen : ""
              }`}
            >
              <img src={noticeArrow} alt="" aria-hidden="true" />
            </span>
          </button>

          {isNoticeOpen && (
            <div id="notice-content" className={styles.noticeContent}>
              {!isSecondRound && (
                <p>• 이번 팀빌딩은 총 3차에 걸쳐 진행됩니다.</p>
              )}
              <p>
                • {isSecondRound ? "2차 팀빌딩도 마찬가지로" : "지원서는"} 최소
                3개 - 최대 5개까지 지원할 수 있으며, 동일 프로젝트에도 서로 다른
                직무로 지원할 수 있습니다.
              </p>
            </div>
          )}
        </div>

        <section className={styles.myApply}>
          <div className={styles.myApplyHeader}>
            <div className={styles.myApplyTitle}>
              <div className={styles.myApplyTitleRow}>
                <h2>내 지원서</h2>
                <div
                  className={`${styles.myApplyCount} ${
                    projectApplications.length >= 3
                      ? styles.myApplyCountActive
                      : ""
                  }`}
                  aria-label={`현재 지원서 ${projectApplications.length}개`}
                >
                  {projectApplications.length}
                </div>
              </div>
              <p>지원한 프로젝트를 한눈에 확인하고, 우선순위를 조정하세요</p>
              <p>(우선순위는 드래그로 조정이 가능합니다)</p>
            </div>
          </div>

          {!isSecondRound && (
            <section
              className={styles.primaryPositionCard}
              aria-labelledby="primary-position-title"
            >
              <div className={styles.primaryPositionHeader}>
                <h2 id="primary-position-title">주요 직무</h2>
                <p>
                  주요 직무는 1차 팀빌딩에는 영향을 미치지 않으며, 3차 팀빌딩 시
                  활용될 예정입니다.
                </p>
              </div>
              <div
                className={`${styles.formGroup} ${styles.primaryPositionSelect}`}
              >
                <select
                  id="primaryPosition"
                  aria-label="주요 직무"
                  value={primaryPosition}
                  onChange={(event) => setPrimaryPosition(event.target.value)}
                >
                  <option value="">직무를 선택해주세요</option>
                  {PRIMARY_POSITION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </section>
          )}

          {projectApplications.length === 0 ? (
            <div className={styles.emptyApply}>
              <img src={emptyFolder} alt="" className={styles.emptyFolder} />
              <p>아직 지원한 프로젝트가 없습니다</p>
            </div>
          ) : (
            <>
              <div className={styles.myApplicationList}>
                {projectApplications.map((application, index) => {
                  const isDropTarget =
                    applicationDragOverId === application.id &&
                    applicationDraggingId !== application.id;
                  const dropPlacementClass = isDropTarget
                    ? applicationDragOverPlacement === "after"
                      ? styles.dropAfter
                      : styles.dropBefore
                    : "";

                  return (
                    <div
                      key={application.id}
                      className={`${styles.myApplicationItem} ${
                        applicationDraggingId === application.id
                          ? styles.dragging
                          : ""
                      } ${isDropTarget ? styles.dragOver : ""} ${dropPlacementClass}`}
                      draggable
                      onDragStart={handleApplicationDragStart(application.id)}
                      onDragEnd={handleApplicationDragEnd}
                      onDragOver={handleApplicationDragOver(application.id)}
                      onDrop={handleApplicationDrop(application.id)}
                    >
                      <div
                        className={`${styles.priorityNumber} ${styles.myApplicationPriorityNumber}`}
                      >
                        {index + 1}
                      </div>
                      <div className={styles.myApplicationName}>
                        <strong>{application.projectTitle}</strong>
                        <span>·</span>
                        <span>{getPositionLabel(application.position)}</span>
                      </div>
                      <button
                        type="button"
                        className={styles.cancelApplicationButton}
                        onClick={() => setCancelTarget(application)}
                        aria-label={`${application.projectTitle} 지원 취소`}
                        title="지원 취소"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
              {projectApplications.length >= 3 && (
                <button
                  type="button"
                  className={`${styles.modifyApplicationButton} ${styles.finalSubmitButton}`}
                  onClick={submitProjectApplications}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "제출 중..." : "최종 제출하기"}
                </button>
              )}
            </>
          )}
        </section>

        <section className={styles.availableSection}>
          <div className={styles.availableHeader}>
            <div>
              <h2>지원가능한 프로젝트</h2>
              <p></p>
            </div>
          </div>

          <div className={styles.availableProjectList}>
            {projects.map((project) => {
              const applications = projectApplications.filter(
                (item) => item.projectId === project.projectId,
              );
              return (
                <article
                  key={project.projectId}
                  className={styles.applicationProjectCard}
                >
                  <div className={styles.applicationProjectTop}>
                    <div
                      className={
                        isSecondRound
                          ? styles.applicationProjectInfo
                          : undefined
                      }
                    >
                      <div className={styles.applicationProjectTitleRow}>
                        <h3>{project.title}</h3>
                        <span
                          className={`${styles.projectTeamBadge} ${
                            styles[
                              `projectTeamBadge${getProjectTeamType(readProjectType(project))}`
                            ]
                          }`}
                        >
                          {getProjectTeamLabel(project)}
                        </span>
                        {isSecondRound && (
                          <span className={styles.recruitCount}>
                            모집인원 : {project.recruitCount ?? 0}명
                          </span>
                        )}
                      </div>
                      <p>{project.summary}</p>
                    </div>
                    {applications.length > 0 && (
                      <span className={styles.appliedMark}></span>
                    )}
                  </div>
                  <div className={styles.recruitBlock}>
                    <div className={styles.recruitPositions}>
                      {project.recruitPositions.map((position) => (
                        <span
                          key={position}
                          className={`${styles.recruitPosition} ${
                            applications.some(
                              (item) => item.position === position,
                            )
                              ? styles.recruitPositionApplied
                              : ""
                          }`}
                        >
                          {getPositionLabel(position)}
                        </span>
                      ))}
                    </div>
                    {isSecondRound && (
                      <div className={styles.projectRequirements}>
                        <p>
                          {project.requirements ||
                            project.requirement ||
                            project.condition ||
                            "등록된 요청 조건이 없습니다."}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className={styles.applicationActions}>
                    {applications.map((application) => (
                      <button
                        key={application.id}
                        type="button"
                        className={styles.modifyApplicationButton}
                        onClick={() =>
                          openProjectApplication(project, application)
                        }
                      >
                        지원서 수정하기 (
                        {getPositionLabel(application.position)})
                      </button>
                    ))}
                    <button
                      type="button"
                      className={
                        applications.length
                          ? styles.addApplicationButton
                          : styles.writeApplicationButton
                      }
                      onClick={() => openProjectApplication(project)}
                      disabled={projectApplications.length >= MAX_SELECTION}
                    >
                      {applications.length
                        ? "+ 지원서 추가 작성하기"
                        : "지원서 작성하기"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
      {applicationModal && (
        <div
          className={styles.applicationModal}
          onMouseDown={closeProjectApplication}
        >
          <div
            className={styles.applicationModalContent}
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-application-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.applicationModalClose}
              onClick={closeProjectApplication}
              aria-label="지원서 닫기"
            >
              ×
            </button>
            <h2 id="project-application-title">
              {applicationModal.project.title} 지원서
            </h2>
            <p className={styles.applicationModalDescription}>
              이 지원서로 {applicationModal.project.title}에 지원하게 됩니다.
            </p>
            <div className={styles.formGroup}>
              <label htmlFor="projectPosition">지원 직무</label>
              <select
                id="projectPosition"
                value={projectFormPosition}
                onChange={(event) => setProjectFormPosition(event.target.value)}
              >
                <option value="">직무를 선택해주세요</option>
                {applicationModal.project.recruitPositions.map((position) => (
                  <option key={position} value={position}>
                    {getPositionLabel(position)}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="projectCareer">경력</label>
              <textarea
                id="projectCareer"
                value={projectFormCareer}
                onChange={(event) => setProjectFormCareer(event.target.value)}
                aria-describedby="project-career-help"
                placeholder="프로젝트, 활동 등 관련 경력을 작성해주세요."
              />
              <p
                id="project-career-help"
                className={styles.applicationModalDescription}
              >
                저장한 경력은 새 지원서에 자동 입력되며, 지원서마다 수정할 수
                있습니다.<br></br>
                없다면 '없음'이라고 작성해주세요
              </p>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="projectMessage">간단 자기소개 및 PR 메시지</label>
              <textarea
                id="projectMessage"
                value={projectFormMessage}
                onChange={(event) =>
                  setProjectFormMessage(event.target.value.slice(0, 60))
                }
                maxLength={60}
                placeholder="자신의 경험과 프로젝트에 기여할 수 있는 부분을 작성해주세요."
              />
              <div className={styles.characterCount}>
                {projectFormMessage.length} / 60
              </div>
            </div>
            <button
              type="button"
              className={styles.modalSubmit}
              onClick={saveProjectApplication}
            >
              지원서 저장하기
            </button>
          </div>
        </div>
      )}
      {cancelTarget && (
        <div
          className={styles.applicationModal}
          onMouseDown={() => setCancelTarget(null)}
        >
          <div
            className={`${styles.applicationModalContent} ${styles.cancelModalContent}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cancel-application-title"
            aria-describedby="cancel-application-warning"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.applicationModalClose}
              onClick={() => setCancelTarget(null)}
              aria-label="지원 취소 확인창 닫기"
            >
              ×
            </button>
            <h2 id="cancel-application-title">지원을 취소하시겠습니까?</h2>
            <p id="cancel-application-warning" className={styles.cancelWarning}>
              취소한 지원서는 복구할 수 없습니다.
            </p>
            <div className={styles.cancelModalActions}>
              <button
                type="button"
                className={styles.confirmCancelButton}
                onClick={cancelProjectApplication}
              >
                지원 취소하기
              </button>
            </div>
          </div>
        </div>
      )}
      {isSubmitConfirmOpen && (
        <div
          className={styles.applicationModal}
          onMouseDown={() => !isSubmitting && setIsSubmitConfirmOpen(false)}
        >
          <div
            className={`${styles.applicationModalContent} ${styles.cancelModalContent} ${styles.submitModalContent}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="submit-application-title"
            aria-describedby="submit-application-description"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.applicationModalClose}
              onClick={() => setIsSubmitConfirmOpen(false)}
              disabled={isSubmitting}
              aria-label="최종 제출 확인창 닫기"
            >
              ×
            </button>
            <h2 id="submit-application-title">최종 제출을 진행하시겠습니까?</h2>
            {!isSecondRound && (
              <div className={styles.submitPrimaryPosition}>
                <span>주요 직무</span>
                <strong>{getPrimaryPositionLabel(primaryPosition)}</strong>
              </div>
            )}
            <ol
              id="submit-application-description"
              className={styles.submitApplicationList}
            >
              {projectApplications.map((application, index) => (
                <li key={application.id}>
                  <span className={styles.submitApplicationPriority}>
                    {index + 1}
                  </span>
                  <strong className={styles.submitApplicationProject}>
                    {application.projectTitle}
                  </strong>
                  <span aria-hidden="true">·</span>
                  <span className={styles.submitApplicationPosition}>
                    {getPositionLabel(application.position)}
                  </span>
                </li>
              ))}
            </ol>
            <p className={styles.cancelWarning}>
              제출 이후 지원서와 우선순위 수정이 불가능합니다.
            </p>
            <div
              className={`${styles.cancelModalActions} ${styles.submitModalActions}`}
            >
              <button
                type="button"
                className={`${styles.confirmCancelButton} ${styles.confirmSubmitButton}`}
                onClick={confirmProjectApplications}
                disabled={isSubmitting}
              >
                {isSubmitting ? "제출 중..." : "최종 제출하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamBuildApplyPage;
