import React from "react";
import styles from "../../assets/TeamBuildApply.module.css";
import {
  getPositionLabel,
  getProjectTeamType,
} from "../../utils/teamBuildApplication";

export default function ApplicationProjectCard({
  project,
  applications,
  teamLabel,
  isSecondRound,
  isAtApplicationLimit,
  onOpenApplication,
}) {
  return (
    <article className={styles.applicationProjectCard}>
      <div className={styles.applicationProjectTop}>
        <div
          className={isSecondRound ? styles.applicationProjectInfo : undefined}
        >
          <div className={styles.applicationProjectTitleRow}>
            <h3>{project.title}</h3>
            <span
              className={`${styles.projectTeamBadge} ${
                styles[
                  `projectTeamBadge${getProjectTeamType(project.projectType)}`
                ]
              }`}
            >
              {teamLabel}
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
      <div
        className={`${styles.recruitBlock} ${
          isSecondRound ? styles.secondRoundRecruitBlock : ""
        }`}
      >
        <div className={styles.recruitPositions}>
          {project.recruitPositions.map((position) => (
            <span
              key={position}
              className={`${styles.recruitPosition} ${
                applications.some((item) => item.position === position)
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
            onClick={() => onOpenApplication(project, application)}
          >
            지원서 수정하기 ({getPositionLabel(application.position)})
          </button>
        ))}
        <button
          type="button"
          className={
            applications.length
              ? styles.addApplicationButton
              : styles.writeApplicationButton
          }
          onClick={() => onOpenApplication(project)}
          disabled={isAtApplicationLimit}
        >
          {applications.length ? "+ 지원서 추가 작성하기" : "지원서 작성하기"}
        </button>
      </div>
    </article>
  );
}
