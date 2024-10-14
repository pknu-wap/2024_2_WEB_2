// src/components/ProjectForm.js
import React from "react";
import "../../assets/ProjectCreation/ProjectForm.css"; // CSS 파일 경로 추가
import useProjectForm from "../../hooks/ProjectCreation/useProjectForm"; // Custome Hook 경로

// 프로젝트 타입
const projectTypeOptions = ["WEB", "APP", "GAME", "기타"];

// 팀원 역할
const roleOptions = [
  "PM",
  "Client",
  "Server",
  "Designer",
  "AI",
  "Game",
  "Hardware",
  "FullStack",
  "기타",
];

const TeamMemberInput = ({
  member,
  index,
  handleMemberNameChange,
  handleMemberImageUpload,
  handleRoleChange,
  handleMemberNameFocus,
}) => (
  <div className="team-member">
    {/* 팀원 이름 입력 */}
    <input
      className="input-field"
      type="text"
      placeholder="팀원 이름"
      value={member.name}
      onChange={(e) => handleMemberNameChange(e, index)}
      onFocus={(e) => handleMemberNameFocus(e, index)}
    />
    {/* 팀원 이미지 업로드 */}
    <input
      className="file-input"
      type="file"
      accept="image/*"
      onChange={(e) => handleMemberImageUpload(e, index)}
    />
    {member.image && (
      <img
        className="member-image"
        src={URL.createObjectURL(member.image)}
        alt={`Member ${index + 1} Image`}
      />
    )}
    {/* 팀원 역할 선택 */}
    <select
      className="select-field"
      value={member.role}
      onChange={(e) => handleRoleChange(e, index)}
    >
      <option value="">역할을 선택해주세요</option>
      {roleOptions.map((role) => (
        <option key={role} value={role}>
          {role}
        </option>
      ))}
    </select>
  </div>
);

const ProjectForm = ({ onSubmit }) => {
  // 커스텀 훅 사용
  // 구조 분해 할당
  const {
    // 상태
    teamName,
    setTeamName,
    title,
    setTitle,
    projectType,
    setProjectType,
    content,
    setContent,
    summary,
    setSummary,
    semester,
    setSemester,
    projectYear,
    setProjectYear,
    teamMembers,
    thumbnail,
    images,

    inputTitle,
    inputContent,
    inputSummary,
    uploading,
    uploadError,
    errorMessage,

    // 핸들러
    handleThumbnailUpload,
    handleImagesUpload,
    handleMemberNameFocus,
    handleMemberNameChange,
    handleMemberImageUpload,
    handleRoleChange,
    addTeamMember,
    handleInputLimit,
    handleSubmit,
  } = useProjectForm();

  return (
    <form className="project-form" onSubmit={(e) => handleSubmit(e, onSubmit)}>
      {/* 썸네일 이미지 업로드 */}
      <div className="form-group">
        <label>썸네일 이미지 업로드:</label>
        <input type="file" accept="image/*" onChange={handleThumbnailUpload} />
        {thumbnail && (
          <div className="thumbnail-preview">
            <img
              src={URL.createObjectURL(thumbnail)}
              alt="Thumbnail Preview"
              style={{ width: "150px", marginTop: "10px" }}
            />
          </div>
        )}
        {errorMessage.thumbnail && (
          <p className="error-message">{errorMessage.thumbnail}</p>
        )}
      </div>

      {/* 연도 선택 */}
      <div className="form-group">
        <label>연도:</label>
        <select
          className="select-field"
          value={projectYear}
          onChange={(e) => setProjectYear(e.target.value)}
        >
          <option value="">연도를 선택해주세요.</option>
          {Array.from({ length: 76 }, (_, i) => 2024 + i).map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* 학기 선택 */}
      <div className="form-group">
        <label>학기:</label>
        <select
          className="select-field"
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
        >
          <option value="">학기를 선택해주세요.</option>
          <option value="1">1학기</option>
          <option value="2">2학기</option>
        </select>
      </div>

      {/* 프로젝트 타입 선택 */}
      <div className="form-group">
        <label>프로젝트 타입:</label>
        <div className="radio-group">
          {projectTypeOptions.map((type) => (
            <label key={type} className="radio-option">
              <input
                type="radio"
                name="projectType"
                value={type}
                checked={projectType === type}
                onChange={(e) => setProjectType(e.target.value)}
              />
              {type}
            </label>
          ))}
        </div>
        {errorMessage.projectType && (
          <p className="error-message">{errorMessage.projectType}</p>
        )}
      </div>
      {/*팀명*/}
      <div className="form-group">
        <label>팀명:</label>
        <input
          name="teamName"
          className="input-field"
          type="text"
          placeholder="팀명을 입력해주세요."
          maxLength={"20"}
          value={teamName}
          onChange={(e) => {
            setTeamName(e.target.value);
            handleInputLimit(e);
          }}
        />
        <span className="char-count">{teamName.length}/20</span>
        {errorMessage.teamName && (
          <p className="error-message">{errorMessage.teamName}</p>
        )}
      </div>

      {/* 제목 입력 */}
      <div className="form-group">
        <label>프로젝트 제목 (팀명):</label>
        <input
          name="title"
          className="input-field"
          type="text"
          placeholder="프로젝트 이름을 입력해주세요."
          maxLength={"20"}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            handleInputLimit(e);
          }}
        />
        <span className="char-count">{inputTitle}/20</span>
        {errorMessage.title && (
          <p className="error-message">{errorMessage.title}</p>
        )}
      </div>

      {/* 한줄 소개 입력 */}
      <div className="form-group">
        <label>한줄 소개:</label>
        <input
          name="summary"
          className="input-field"
          type="text"
          placeholder="프로젝트를 한줄로 소개해주세요."
          value={summary}
          maxLength={"30"}
          onChange={(e) => {
            setSummary(e.target.value);
            handleInputLimit(e);
          }}
        />
        <span className="char-count">{inputSummary}/30</span>
        {errorMessage.summary && (
          <p className="error-message">{errorMessage.summary}</p>
        )}
      </div>

      {/* 프로젝트 상세 설명 */}
      <div className="form-group">
        <label>프로젝트 상세 설명:</label>
        <textarea
          className="textarea-field"
          name="content"
          placeholder="프로젝트 상세 설명을 입력해주세요."
          value={content}
          maxLength={"600"}
          onChange={(e) => {
            setContent(e.target.value);
            handleInputLimit(e);
          }}
          required
          rows="5"
        />
        <span className="char-count">{inputContent}/600</span>
      </div>

      {/* 이미지 업로드 */}
      <div className="form-group">
        <label>이미지 업로드:</label>
        <input
          className="file-input"
          type="file"
          accept="image/*"
          multiple
          onChange={handleImagesUpload}
        />
        {images.length > 0 && (
          <div className="image-preview">
            {images.map((image, index) => (
              <img
                key={index}
                className="uploaded-image"
                src={URL.createObjectURL(image)}
                alt={`Image Preview ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* 팀원 입력 */}
      <div className="form-group">
        <label>팀원:</label>
        {teamMembers.map((member, index) => (
          <TeamMemberInput
            key={index}
            member={member}
            index={index}
            handleMemberNameChange={handleMemberNameChange}
            handleMemberImageUpload={handleMemberImageUpload}
            handleRoleChange={handleRoleChange}
            handleMemberNameFocus={handleMemberNameFocus}
          />
        ))}
        <button
          className="add-member-btn"
          type="button"
          onClick={addTeamMember}
        >
          팀원 추가
        </button>
      </div>

      {/* 기술 스택 추가 예정 */}

      {uploadError && <p className="error-message">{uploadError}</p>}

      <button className="submit-btn" type="submit" disabled={uploading}>
        {uploading ? "업로드 중..." : "프로젝트 생성"}
      </button>
    </form>
  );
};

export default ProjectForm;
