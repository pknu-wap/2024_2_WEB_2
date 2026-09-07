import { useState, useEffect, useCallback } from "react";
import styles from "../../assets/Admin/ManageTeamBuild.module.css";
import { adminTeamBuildApi } from "../../api/admin";
import { FiDownload, FiPlay } from "react-icons/fi";
import { getTeamBuildStep, getPreviousTeamBuildStatus, getNextTeamBuildStatus, getTeamBuildAllocationState } from "../../utils/teamBuildProgress";
import useSemester from "../../hooks/useSemester";
import { IconCheck } from "../../components/Admin/icons";

const ManageTeamBuildPage = () => {
  const [round, setRound] = useState(1);
  const [completedRound, setCompletedRound] = useState(0);
  const [loading, setLoading] = useState(false); // 로딩 중 여부
  const [status, setStatus] = useState("unavailable"); // 현재 팀빌딩 상태
  const [statusLoading, setStatusLoading] = useState(true); // 팀빌딩 상태 로드 여부
  const [statusChanging, setStatusChanging] = useState(false); // 상태 변경 중 여부(버튼 중복 클릭 방지)
  const semester = useSemester();

  const statusSteps = [
    { key: "OPEN", label: "시작" },
    { key: "APPLY_1", label: "1차 지원" },
    { key: "RECRUIT_1", label: "1차 모집" },
    { key: "APPLY_2", label: "2차 지원" },
    { key: "RECRUIT_2", label: "2차 모집" },
    { key: "THIRD", label: "3차 팀빌딩" },
    { key: "RESULT", label: "결과" },
  ];
  const currentStep = getTeamBuildStep({ status, round, completedRound });
  const currentIdx = statusSteps.findIndex((step) => step.key === currentStep);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await adminTeamBuildApi.getTeamBuildStatus();
      setStatus(res.status);
      setRound(res.round ?? 1);
      setCompletedRound(res.completedRound ?? 0);
      setStatusLoading(false);
    } catch (e) {
      alert("팀빌딩 상태 조회에 실패했습니다.");
      setStatus("unavailable");
    } finally {
      setStatusLoading(false);
    }
  }, []);

  // 상태 조회 (최초)
  useEffect(() => {
    fetchStatus();
  }, [semester, fetchStatus]);

  // 팀빌딩 시작 (open)
  const handleOpenTeamBuild = async () => {
    setStatusChanging(true);
    try {
      await adminTeamBuildApi.createTeamBuild(); // 팀빌딩 시작
      setStatus("OPEN");
    } catch (e) {
      alert("팀빌딩 시작에 실패했습니다.");
    }
    setStatusChanging(false);
  };

  const nextStatus = getNextTeamBuildStatus({ status, round, completedRound });
  const allocationState = getTeamBuildAllocationState({ status, round, completedRound });

  // 상태 변경 (다음 단계로)
  const handleChangeStatus = async () => {
    if (!nextStatus || statusChanging || statusLoading || loading) return;
    setStatusChanging(true);
    try {
      await adminTeamBuildApi.updateTeamBuildStatus(semester, nextStatus); // 상태 변경
      // Refresh status and round together; APPLY may have opened round 2.
      await fetchStatus();
    } catch (e) {
      console.error(e);
      alert("상태 변경에 실패했습니다.");
    } finally {
      setStatusChanging(false);
    }
  };

  const previousStatus = getPreviousTeamBuildStatus({ status, round, completedRound });
  const canGoBack = previousStatus !== null;
  const handlePreviousStep = async () => {
    if (!canGoBack || statusChanging || loading) return;
    setStatusChanging(true);
    try {
      await adminTeamBuildApi.updateTeamBuildStatus(semester, previousStatus);
      await fetchStatus();
    } catch (e) {
      alert("이전 단계로 변경하지 못했습니다.");
    } finally {
      setStatusChanging(false);
    }
  };

  // 모집 마감 후 아직 배정하지 않은 차수만 실행 가능
  const canRunAlgorithm = allocationState === "PENDING";

  // 팀 빌딩 알고리즘 실행 (CLOSED 상태에서만)
  const handleRunTeamBuilding = async () => {
    if (!canRunAlgorithm) return; // 실행 가능 상태가 아니면 아무것도 하지 않음
    if (!window.confirm("정말 팀 빌딩 알고리즘을 실행하시겠습니까?")) return;
    setLoading(true);
    try {
      await adminTeamBuildApi.runTeamBuilding();
      await fetchStatus();
      alert("팀 빌딩 알고리즘이 성공적으로 실행되었습니다!");
    } catch (e) {
      alert("팀 빌딩 알고리즘 실행에 실패했습니다.");
    }
    setLoading(false);
  };

  // CSV 다운로드 함수
  const handleDownload = async (type) => {
    setLoading(true);
    try {
      let res;
      if (type === "applies") {
        res = await adminTeamBuildApi.getApplies();
      } else {
        res = await adminTeamBuildApi.getRecruits();
      }

      const data = res.data || res;
      const blob = new Blob(["\uFEFF", data], {
        type: "text/csv;charset=utf-8;",
      });

      // 파일 다운로드 처리
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        type === "applies" ? "지원현황.csv" : "모집현황.csv",
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("CSV 다운로드에 실패했습니다.");
    }
    setLoading(false);
  };

  return (
    <div className={styles.container}>
      {/* 상단 영역 */}
      <div className={styles.upperBox}>
        <div className={styles.stepCard}>
          <div className={styles.progressHeading}>
            <div>
              <span className={styles.progressEyebrow}>2026-02</span>
              <h2>TEAM BUILDING</h2>
            </div>
          </div>
          <ol className={styles.stepper} aria-label="팀빌딩 진행 과정">
            {statusSteps.map((step, idx) => (
              <li key={step.key}
                aria-current={idx === currentIdx ? "step" : undefined}
                className={`${styles.step} ${idx < currentIdx ? styles.completed : ""} ${idx === currentIdx ? styles.current : ""}`}>
                <span className={styles.stepLabel}>{step.label}</span>
                <div className={styles.circle} aria-hidden="true">
                  {idx < currentIdx ? <IconCheck color="#000" size="1" /> : idx + 1}
                </div>
                <small>{idx < currentIdx ? "완료" : idx !== currentIdx ? "대기"
                  : step.key === `RECRUIT_${round}` && allocationState === "PENDING" ? "배정 대기"
                  : step.key === `RECRUIT_${round}` && allocationState === "COMPLETED" ? "배정 완료"
                  : "진행 중"}</small>
              </li>
            ))}
          </ol>
          {currentStep === "THIRD" && (
            <p className={styles.stageNotice}>3차 팀빌딩 실행 기능 연결이 필요합니다.</p>
          )}
          <div className={styles.progressFooter}>
            <button className={styles.teamBuildBtn} onClick={handleRunTeamBuilding}
              disabled={loading || statusLoading || statusChanging || !canRunAlgorithm}>
              <FiPlay aria-hidden="true" /> 팀 빌딩 알고리즘 실행
            </button>
          <div className={styles.stageActions}>
          <button className={styles.previousBtn} onClick={handlePreviousStep}
            disabled={!canGoBack || statusChanging || statusLoading || loading}>
            ← 이전 단계
          </button>
          <button className={styles.nextBtn}
            onClick={currentStep === "unavailable" ? handleOpenTeamBuild : handleChangeStatus}
            disabled={statusChanging || statusLoading || loading ||
              (currentStep !== "unavailable" && !nextStatus)}>
            {currentStep === "unavailable" ? "팀빌딩 시작하기"
              : currentStep === "RESULT" ? "진행 완료"
              : canRunAlgorithm ? `${round}차 배정 대기`
              : status === "CLOSED" && nextStatus === "APPLY" ? "2차 지원 시작 →"
              : status === "RECRUIT" ? `${round}차 모집 마감`
              : "다음 단계 →"}
          </button>
          </div>
          </div>
        </div>
      </div>

      <section className={styles.underBox} aria-labelledby="team-data-title">
        <div className={styles.sectionHeading}>
          <h2 id="team-data-title">팀빌딩 데이터</h2>
          <span className={styles.semesterBadge}>{semester}</span>
        </div>
        <div className={styles.csvGrid}>
          {[
            { type: "applies", title: "지원 CSV" },
            { type: "recruits", title: "모집 CSV" },
          ].map(({ type, title }) => (
            <article className={styles.csvCard} key={type}>
              <h3>{title}</h3>
              <button className={styles.exportBtn} onClick={() => handleDownload(type)}
                disabled={loading || statusLoading} aria-label={`${title} 다운로드`}>
                <FiDownload size={16} aria-hidden="true" /> 다운로드
              </button>
            </article>
          ))}
        </div>
        {(loading || statusLoading) && <p role="status">처리 중...</p>}
      </section>
    </div>
  );
};

export default ManageTeamBuildPage;
