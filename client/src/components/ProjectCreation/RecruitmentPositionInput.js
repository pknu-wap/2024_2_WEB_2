import React from "react";
import { POSITIONS } from "../../constants/positions";
import { getPositionLabel } from "../../utils/teamBuildApplication";
import styles from "../../assets/ProjectCreation/ProjectForm.module.css";

const normalizeRole = (role) => {
  const value = (role || "").trim();
  const aliases = {
    CLIENT: "FRONTEND", SERVER: "BACKEND", DESIGNER: "DESIGN",
    디자인: "DESIGN", HARDWARE: "EMBEDDED", 하드웨어: "EMBEDDED",
  };
  const code = aliases[value.toUpperCase()] || value.toUpperCase();
  return POSITIONS.find((position) =>
    position === code || getPositionLabel(position) === value,
  );
};

export const recruitmentPositionsError = (positions) => {
  const roles = positions.map(({ role }) => normalizeRole(role));
  if (roles.some((role) => !role)) {
    return "존재하는 모집 직무를 선택해 주세요.";
  }
  if (new Set(roles).size !== roles.length) {
    return "모집 직무가 중복되었습니다.";
  }
  if (
    positions.some(
      ({ count }) =>
        !Number.isInteger(Number(count)) ||
        Number(count) < 1 ||
        Number(count) > 2147483647,
    )
  ) {
    return "모집 인원은 1 이상의 정수로 입력해 주세요.";
  }
  return "";
};

export default function RecruitmentPositionInput({ positions, onChange }) {
  const update = (index, field, value) => {
    onChange(
      positions.map((position, i) =>
        i === index ? { ...position, [field]: value } : position,
      ),
    );
  };

  return (
    <section className={styles.recruitment} aria-label="모집 인원 (팀장 제외)">
      <h3>모집 인원 (팀장 제외)</h3>
      <p>모집할 직무와 인원을 추가해 주세요. (선택)</p>
      {positions.map((position, index) => (
        <div className={styles.recruitment_row} key={index}>
          <label>
            직무 {index + 1}
            <select
              value={normalizeRole(position.role) || ""}
              required
              onChange={(event) => update(index, "role", getPositionLabel(event.target.value))}
            >
              <option value="">직무 선택</option>
              {POSITIONS.map((role) => (
                <option
                  key={role}
                  value={role}
                  disabled={positions.some((other, i) =>
                    i !== index && normalizeRole(other.role) === role,
                  )}
                >
                  {getPositionLabel(role)}
                </option>
              ))}
            </select>
          </label>
          <label>
            모집 인원 {index + 1} (명)
            <input
              type="number"
              min="1"
              max="2147483647"
              step="1"
              required
              value={position.count}
              onChange={(event) => update(index, "count", event.target.value)}
            />
          </label>
          <button
            type="button"
            aria-label={`모집 직무 ${index + 1} 삭제`}
            onClick={() => onChange(positions.filter((_, i) => i !== index))}
          >
            삭제
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...positions, { role: "", count: 1 }])}
      >
        모집 직무 추가
      </button>
    </section>
  );
}
