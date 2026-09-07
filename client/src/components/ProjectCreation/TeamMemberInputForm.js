import React from "react";
import styles from "../../assets/ProjectCreation/TeamMemberInputForm.module.css"; // CSS 파일 경로 추가

const TeamMemberInputForm = ({
  member,
  index,
  handleMemberNameChange,
  handleRoleChange,
  handleMemberNameFocus,
  roleOptions,
  addTeamMember,
  teamMembers,
  handleRemoveTeamMember,
}) => (
  <div className={styles.teammember}>
    {index === teamMembers.length - 1 && (
      <label className={styles.teammember_label}>팀원 등록</label>
    )}
    <div className={styles.teammember_form}>
      {/* 팀원 이름 입력 */}
      <input
        className={styles.teammember_input}
        type="text"
        placeholder="팀원 이름"
        value={member.memberName}
        onChange={(e) => handleMemberNameChange(e, index)}
        onFocus={(e) => handleMemberNameFocus(e, index)}
      />

      {/* 팀원 역할 선택 */}
      <select
        className={styles.teammember_role_select_field}
        value={member.memberRole}
        onChange={(e) => handleRoleChange(e, index)}
      >
        <option value="">역할</option>
        {roleOptions.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>

      {/* 삭제 버튼 */}
      {/*등록된 팀원인 경우에만 삭제 버튼 표시 */}
      {index !== teamMembers.length - 1 && (
        <button
          className={styles.teammember_remove_btn}
          type="button"
          onClick={() => handleRemoveTeamMember(index)}
        >
          삭제
        </button>
      )}
      {/* 등록 버튼 */}
      {index === teamMembers.length - 1 && (
        <button
          className={styles.teammember_add_btn}
          type="button"
          onClick={addTeamMember}
        >
          등록
        </button>
      )}
    </div>
  </div>
);
export default TeamMemberInputForm;
