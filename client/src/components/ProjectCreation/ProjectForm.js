// src/components/ProjectForm.js
import React, { useState } from "react";
import "../../assets/ProjectCreation/ProjectForm.css"; // CSS 파일 경로 추가

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

const ProjectForm = ({ onSubmit }) => {
  // 입력 폼 요소들의 상태
  const [title, setTitle] = useState("");
  const [projectType, setProjectType] = useState("");
  const [content, setContent] = useState("");
  const [summary, setSummary] = useState("");
  const [semester, setSemester] = useState(""); // 1,2
  const [projectYear, setProjectYear] = useState(""); // 선택으로... 2024~2099
  // 팀장 선택 상태관리
  const [isLearder, setIsLeader] = useState(false);
  const [teamMembers, setTeamMembers] = useState([
    { name: "", image: null, role: "" },
  ]);
  const [techStacks, setTechStacks] = useState([]);
  const [thumbnail, setThumbnail] = useState(null);
  const [images, setImages] = useState([]);

  // 입력 필드 글자 수 제한
  const [inputTitle, setInputTitle] = useState(0);
  const [inputContent, setInputContent] = useState(0);
  const [inputSummary, setInputSummary] = useState(0);

  // upload 관련 상태
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // 오류 메시지 상태
  const [errorMessage, setErrorMessage] = useState({});

  // 폼 제출 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return; // 유효성 검사가 실패하면 제출하지 않음
    }

    const projectData = {
      title,
      projectType,
      content,
      summary,
      semester: parseInt(semester, 10),
      projectYear: parseInt(projectYear, 10),

      // 팀원 정보 (이름, 사진, 역할)
      teamMembers: teamMembers
        .filter((m) => m.name.trim() !== "")
        .map((member) => ({
          memberName: member.name,
          memberImage: member.image,
          memberRole: member.role,
        })),
      techStacks: techStacks.map((name) => ({ techStackName: name })), // 선택한 기술 스택
    };

    try {
      setUploading(true);
      await onSubmit(projectData, thumbnail, images);
      setUploading(false);

      // 폼 초기화
      setTitle("");
      setProjectType("");
      setContent("");
      setSummary("");
      setSemester("");
      setProjectYear("");
      setIsLeader(false);
      setTeamMembers([{ name: "", image: null, role: "" }]);
      setTechStacks([]);
      setThumbnail(null);
      setImages([]);
      setErrorMessage({});
      setUploadError(null);
    } catch (error) {
      console.error("프로젝트 생성 실패:", error);
      setUploadError("프로젝트 생성에 실패했습니다. 다시 시도해 주세요.");
      setUploading(false);
    }
  };

  // 썸네일 이미지 업로드 핸들러
  const handleThumbnailUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setThumbnail(file);
    }
  };

  // 이미지 업로드 핸들러 (배열 반복문)
  const handleImagesUpload = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
  };

  // 팀원 이름 입력 포커스 핸들러
  const handleMemberNameFocus = (e, index) => {
    if (!index && !isLearder) {
      alert("첫 번째 팀원으로는 팀장을 입력해주세요.");
      setIsLeader(true);
    }
  };

  // 팀원 이름 변경 핸들러
  const handleMemberNameChange = (e, index) => {
    const newTeamMembers = [...teamMembers];
    newTeamMembers[index].name = e.target.value;
    setTeamMembers(newTeamMembers);
  };

  // 팀원 이미지 업로드 핸들러
  const handleMemberImageUpload = (e, index) => {
    const file = e.target.files[0];
    if (file) {
      const newTeamMembers = [...teamMembers];
      newTeamMembers[index].image = file;
      setTeamMembers(newTeamMembers);
    }
  };

  // 팀원 역할 변경 핸들러
  const handleRoleChange = (e, index) => {
    const newTeamMembers = [...teamMembers];
    newTeamMembers[index].role = e.target.value;
    setTeamMembers(newTeamMembers);
  };

  // 입력 필드 글자 수 제한 핸들러
  const handleInputLimit = (e) => {
    const { name, value } = e.target; // name과 value 추출
    if (name === "title") {
      setInputTitle(value.length);
    } else if (name === "content") {
      setInputContent(value.length);
    } else if (name === "summary") {
      setInputSummary(value.length);
    }
  };

  // 유효성 검사 함수(프로젝트 명, 한줄 소개, 프로젝트 타입, 썸네일)
  const validateForm = () => {
    const errors = {};

    // 필수 입력 필드 검사
    if (title.trim() === "") {
      errors.title = "프로젝트 제목을 입력해주세요.";
    }

    if (summary.trim() === "") {
      errors.summary = "한줄 소개를 입력해주세요.";
    }

    if (!projectType) {
      errors.projectType = "프로젝트 타입을 선택해주세요.";
    }

    if (!thumbnail) {
      errors.thumbnail = "썸네일 이미지를 업로드해주세요.";
    }

    setErrorMessage(errors);

    // 오류가 있으면 false 반환, 없으면 true 반환
    return Object.keys(errors).length === 0;
  };

  return (
    <form className="project-form" onSubmit={handleSubmit}>
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

      {/* 팀원 입력 */}
      <div className="form-group">
        <label>팀원:</label>
        {teamMembers.map((member, index) => (
          <div key={index} className="team-member">
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
        ))}
        <button
          className="add-member-btn"
          type="button"
          onClick={() => {
            if (teamMembers[teamMembers.length - 1].name.trim() !== "") {
              setTeamMembers([
                ...teamMembers,
                { name: "", image: null, role: "" },
              ]);
            }
          }}
        >
          팀원 추가
        </button>
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

      {uploadError && <p className="error-message">{uploadError}</p>}

      <button className="submit-btn" type="submit" disabled={uploading}>
        {uploading ? "업로드 중..." : "프로젝트 생성"}
      </button>
    </form>
  );
};

export default ProjectForm;
