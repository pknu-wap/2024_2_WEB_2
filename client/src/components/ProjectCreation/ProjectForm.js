// src/components/ProjectForm.js
import React from "react";

// 기술스택 (일단 7가지)
const techStackOptions = [
  "React",
  "Node.js",
  "Python",
  "Java",
  "AWS",
  "MySQL",
  "Spring Boot",
];
// 프로젝트 타입
const projectTypeOptions = ["WEB", "APP", "GAME"];

const ProjectForm = () => {
  return (
    <form>
      {/* 제목 입력 */}
      <div>
        <label>프로젝트 제목: </label>
        <input type="text" placeholder="프로젝트 이름을 입력해주세요." />
      </div>

      {/* 프로젝트 타입 선택 */}
      <div>
        <label>프로젝트 타입: </label>
        <div>
          {projectTypeOptions.map((type) => (
            <label key={type} style={{ marginRight: "10px" }}>
              <input type="radio" name="projectType" value={type} />
              {type}
            </label>
          ))}
        </div>
      </div>

      {/* 한줄 소개 입력 */}
      <div>
        <label>한줄 소개: </label>
        <input type="text" placeholder="프로젝트를 한줄로 소개해주세요." />
      </div>

      {/* 연도 선택 */}
      <div>
        <label>연도: </label>
        <select>
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
        <label>학기: </label>
        <select>
          <option value="">학기를 선택해주세요.</option>
          <option value="1">1학기</option>
          <option value="2">2학기</option>
        </select>
      </div>

      {/* 팀원 입력 */}
      <div>
        <label>팀원: </label>
        <input type="text" placeholder="팀원" />
        <button type="button">Add Team Member</button>
      </div>

      {/* 기술 스택 선택 */}
      <div>
        <label>기술 스택 선택: </label>
        <div>
          {techStackOptions.map((tech) => (
            <label key={tech} style={{ display: "block" }}>
              <input type="checkbox" value={tech} />
              {tech}
            </label>
          ))}
        </div>
      </div>

      {/* 프로젝트 상세 설명 */}
      <div>
        <label>프로젝트 상세 설명: </label>
        <textarea placeholder="프로젝트 상세 설명을 입력해주세요." rows="5" />
      </div>

      {/* 썸네일 이미지 업로드 */}
      <div>
        <label>썸네일 이미지 업로드: </label>
        <input type="file" accept="image/*" />
      </div>

      {/* 이미지 업로드 */}
      <div>
        <label>이미지 업로드: </label>
        <input type="file" accept="image/*" multiple />
      </div>

      <button type="submit">프로젝트 생성</button>
    </form>
  );
};

export default ProjectForm;
