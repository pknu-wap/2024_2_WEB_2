// src/components/ProjectForm.js
import React, { useState } from "react";
import TechStackSelector from "./TechStackSelector";

// 프로젝트 타입
const projectTypeOptions = ["WEB", "APP", "GAME"];

const ProjectForm = (onSubmit) => {
  // 입력 폼 요소들의 상태
  const [title, setTitle] = useState("");
  const [projectType, setProjectType] = useState("");
  const [content, setContent] = useState("");
  const [summary, setSummary] = useState("");
  const [semester, setSemester] = useState(""); // 1,2
  const [projectYear, setProjectYear] = useState(""); // 선택으로... 2024~
  const [teamMembers, setTeamMembers] = useState([""]);
  const [techStacks, setTechStacks] = useState([]);
  const [thumbnail, setThumbnail] = useState(null);
  const [images, setImages] = useState([]);

  // upload 관련 상태
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // 기술 스택 선택 관련 핸들러는 일단 삭제함.

  // 폼 제출 핸들러
  const handleSubmit = async (e) => {
    // 새로고침 기본동작 방지
    e.preventDefault();

    // 프로젝트 데이터 구성
    const projectData = {
      title,
      projectType,
      content,
      summary,
      semester: parseInt(semester, 10),
      projectYear: parseInt(projectYear, 10),
      teamMember: teamMembers
        .filter((m) => m.trim() !== "")
        .map((name) => ({ memberName: name })), // 빈 팀원 필터링
      techStack: techStacks.map((name) => ({ techStackName: name })), // 선택한 기술 스택
    };

    try {
      setUploading(true);

      // 프로젝트 데이터, 썸네일, 이미지 파일들을 전달하여 onSubmit 호출(ProjectForm에서 props로 받음)
      await onSubmit(projectData, thumbnail, images);
      setUploading(false);

      // 데이터 전송 성공 시 폼 초기화
      setTitle("");
      setProjectType("");
      setContent("");
      setSummary("");
      setSemester("");
      setProjectYear("");
      setTeamMembers([""]);
      setTechStacks([]);
      setThumbnail(null);
      setImages([]);
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

  return (
    <form onSubmit={handleSubmit}>
      {/* 제목 입력 */}
      <div>
        <label>프로젝트 제목 (팀명):</label>
        <input
          type="text"
          placeholder="프로젝트 이름을 입력해주세요."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      {/* 프로젝트 타입 선택 */}
      <div>
        <label>프로젝트 타입:</label>
        <div>
          {projectTypeOptions.map((type) => (
            <label key={type} style={{ marginRight: "10px" }}>
              <input
                type="radio"
                name="projectType"
                value={type}
                checked={projectType === type}
                onChange={(e) => setProjectType(e.target.value)}
                required
              />
              {type}
            </label>
          ))}
        </div>
      </div>

      {/* 한줄 소개 입력 */}
      <div>
        <label>한줄 소개:</label>
        <input
          type="text"
          placeholder="프로젝트를 한줄로 소개해주세요."
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          required
        />
      </div>

      {/* 연도 선택 */}
      <div>
        <label>연도:</label>
        <select
          value={projectYear}
          onChange={(e) => setProjectYear(e.target.value)}
          required
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
      <div>
        <label>학기:</label>
        <select
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
          required
        >
          <option value="">학기를 선택해주세요.</option>
          <option value="1">1학기</option>
          <option value="2">2학기</option>
        </select>
      </div>

      {/* 팀원 입력 */}
      <div>
        <label>팀원:</label>
        {teamMembers.map((member, index) => (
          <input
            key={index}
            type="text"
            placeholder="팀원"
            value={member}
            onChange={(e) => {
              const newTeamMembers = [...teamMembers];
              newTeamMembers[index] = e.target.value;
              setTeamMembers(newTeamMembers);
            }}
          />
        ))}
        <button
          type="button"
          onClick={() => {
            if (teamMembers[teamMembers.length - 1].trim() !== "") {
              setTeamMembers([...teamMembers, ""]); // Only add an empty field if the last one is filled
            }
          }}
        >
          Add Team Member
        </button>
      </div>

      {/* 기술 스택 선택 컴포넌트 */}
      <TechStackSelector />

      {/* 프로젝트 상세 설명 */}
      <div>
        <label>프로젝트 상세 설명:</label>
        <textarea
          placeholder="프로젝트 상세 설명을 입력해주세요."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows="5"
        />
      </div>

      {/* 썸네일 이미지 업로드 */}
      <div>
        <label>썸네일 이미지 업로드:</label>
        <input type="file" accept="image/*" required />
        {thumbnail && (
          <div>
            <img
              src={URL.createObjectURL(thumbnail)}
              alt="Thumbnail Preview"
              style={{ width: "150px", marginTop: "10px" }}
            />
          </div>
        )}
      </div>

      {/* 이미지 업로드 */}
      <div>
        <label>이미지 업로드:</label>
        <input type="file" accept="image/*" multiple required />
        {images.length > 0 && (
          <div>
            {images.map((image, index) => (
              <img
                key={index}
                src={URL.createObjectURL(image)}
                alt={`Image Preview ${index + 1}`}
                style={{
                  width: "150px",
                  marginTop: "10px",
                  marginRight: "10px",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {uploadError && <p style={{ color: "red" }}>{uploadError}</p>}

      <button type="submit" disabled={uploading}>
        {uploading ? "업로드 중..." : "프로젝트 생성"}
      </button>
    </form>
  );
};

export default ProjectForm;
