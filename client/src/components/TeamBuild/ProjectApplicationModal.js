import React, { useState } from "react";
import styles from "../../assets/TeamBuildApply.module.css";
import {
  getPositionLabel,
  MAX_MESSAGE_LENGTH,
} from "../../utils/teamBuildApplication";

export default function ProjectApplicationModal({
  project,
  application,
  defaultCareer,
  onSave,
  onClose,
}) {
  const [projectFormPosition, setProjectFormPosition] = useState(
    application?.position || "",
  );
  const [projectFormCareer, setProjectFormCareer] = useState(
    application?.career ?? defaultCareer,
  );
  const [projectFormMessage, setProjectFormMessage] = useState(
    application?.message || "",
  );

  const handleSave = () => {
    if (!project.recruitPositions.includes(projectFormPosition)) {
      alert("지원 직무를 선택해주세요.");
      return;
    }
    if (!projectFormMessage.trim()) {
      alert("자기소개 및 PR 메시지를 작성해주세요.");
      return;
    }

    if (projectFormMessage.length > MAX_MESSAGE_LENGTH) {
      alert(
        `간단 자기소개 및 PR 메시지는 ${MAX_MESSAGE_LENGTH}자까지 작성할 수 있습니다.`,
      );
      return;
    }

    onSave({
      position: projectFormPosition,
      career: projectFormCareer.trim(),
      message: projectFormMessage.trim(),
    });
  };

  return (
    <div className={styles.applicationModal} onMouseDown={onClose}>
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
          onClick={onClose}
          aria-label="지원서 닫기"
        >
          ×
        </button>
        <h2 id="project-application-title">{project.title} 지원서</h2>
        <p className={styles.applicationModalDescription}>
          이 지원서로 {project.title}에 지원하게 됩니다.
        </p>
        {project.recruitPositions.length === 0 && (
          <p role="status">등록된 모집 직무가 없어 지원할 수 없습니다.</p>
        )}
        <div className={styles.formGroup}>
          <label htmlFor="projectPosition">지원 직무</label>
          <select
            id="projectPosition"
            value={projectFormPosition}
            onChange={(event) => setProjectFormPosition(event.target.value)}
          >
            <option value="">직무를 선택해주세요</option>
            {project.recruitPositions.map((position) => (
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
            있습니다.
            <br />
            없다면 '없음'이라고 작성해주세요
          </p>
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="projectMessage">간단 자기소개 및 PR 메시지</label>
          <textarea
            id="projectMessage"
            value={projectFormMessage}
            onChange={(event) =>
              setProjectFormMessage(
                event.target.value.slice(0, MAX_MESSAGE_LENGTH),
              )
            }
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="자신의 경험과 프로젝트에 기여할 수 있는 부분을 작성해주세요."
          />
          <div className={styles.characterCount}>
            {projectFormMessage.length} / {MAX_MESSAGE_LENGTH}
          </div>
        </div>
        <button
          type="button"
          className={styles.modalSubmit}
          onClick={handleSave}
          disabled={project.recruitPositions.length === 0}
        >
          지원서 저장하기
        </button>
      </div>
    </div>
  );
}
