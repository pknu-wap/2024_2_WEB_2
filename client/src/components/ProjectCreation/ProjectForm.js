// src/components/ProjectForm.js
import React from "react";
import styles from "../../assets/ProjectCreation/ProjectForm.module.css"; // CSS 파일 경로 추가
import useProjectForm from "../../hooks/ProjectCreation/useProjectForm"; // Custome Hook 경로
import ImageUploader from "./ImageUploader";
import YearScroll from "./YearSelector";
import RadioButton from "./RadioButton";
import InputForm from "./InputForm";

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
    handleImgUpload,
    handleMemberNameFocus,
    handleMemberNameChange,
    handleMemberImageUpload,
    handleRoleChange,
    addTeamMember,
    handleInputLimit,
    handleSubmit,
  } = useProjectForm();

  return (
    <form
      className={styles.project_form}
      onSubmit={(e) => handleSubmit(e, onSubmit)}
    >
      {/* 썸네일 이미지 업로드 */}
      <ImageUploader
        imgText={"메인 이미지 등록"}
        imgName={thumbnail}
        errorMessage={errorMessage.thumbnail}
        handleImgUpload={(file) => handleImgUpload(file, "thumbnail")}
        type="thumbnail"
      />
      {/* 년도 선택 */}
      <YearScroll setSelectedYear={setProjectYear} selectedYear={projectYear} />

      {/* 학기 선택 */}
      <RadioButton
        labelname={"학기"}
        name="semester" // 그룹 이름
        options={["1", "2"]} // 옵션 배열
        selected={semester} // 선택된 값
        setSelected={setSemester} // 선택 상태 업데이트 함수
      />

      {/* 프로젝트 타입 선택 */}
      <RadioButton
        labelname={"프로젝트 타입"}
        name="projectType"
        options={projectTypeOptions}
        selected={projectType}
        setSelected={setProjectType}
      />

      {/* 프로젝트 타입 선택
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
      </div> */}

      {/* 팀명 */}
      {/* <div className="form-group">
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
      </div> */}

      <InputForm
        name="teamName"
        placeholder="팀명"
        maxLen="20"
        value={teamName}
        onChange={(e) => {
          setTeamName(e.target.value);
          handleInputLimit(e);
        }}
        errorMessage={errorMessage}
      />

      <InputForm
        name="title"
        placeholder="프로젝트 명"
        maxLen="20"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          handleInputLimit(e);
        }}
        errorMessage={errorMessage}
      />

      {/* 제목 입력 */}
      {/* <div className="form-group">
        <label>프로젝트 제목:</label>
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
      </div> */}

      <InputForm
        name="summary"
        placeholder="한줄 소개"
        maxLen="20"
        value={summary}
        onChange={(e) => {
          setSummary(e.target.value);
          handleInputLimit(e);
        }}
        errorMessage={errorMessage}
      />

      {/* 한줄 소개 입력 */}
      {/* <div className="form-group">
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
      </div> */}

      <InputForm
        name="content"
        placeholder="상세 설명"
        maxLen="600"
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          handleInputLimit(e);
        }}
        errorMessage={errorMessage}
      />

      {/* 프로젝트 상세 설명 */}
      {/* <div className="form-group">
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
        {errorMessage.content && (
          <p className="error-message">{errorMessage.content}</p>
        )}
      </div> */}

      {/* 이미지 업로더들 */}
      <div className="form-group">
        <label>이미지 업로드:</label>
        {images.map((img, index) => (
          <ImageUploader
            key={index}
            imgText={`이미지 등록 ${index + 1}`}
            imgName={images[index]}
            errorMessage={errorMessage[`image${index}`]}
            handleImgUpload={(file) => handleImgUpload(file, "image", index)}
            type="image"
          />
        ))}
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
