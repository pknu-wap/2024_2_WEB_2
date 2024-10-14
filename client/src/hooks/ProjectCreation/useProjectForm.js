// src/hooks/useProjectForm.js
// Custon Hook for Project Form
import { useState } from "react";

const useProjectForm = () => {
  // 입력 폼 요소들의 상태
  const [title, setTitle] = useState("");
  const [projectType, setProjectType] = useState("");
  const [content, setContent] = useState("");
  const [summary, setSummary] = useState("");
  const [semester, setSemester] = useState(""); // 1,2
  const [projectYear, setProjectYear] = useState(""); // 선택으로... 2024~2099

  // 팀장 선택 상태관리
  const [isLeader, setIsLeader] = useState(false);
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

  // 업로드 관련 상태
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // 오류 메시지 상태
  const [errorMessage, setErrorMessage] = useState({});

  // 핸들러 함수들

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
    if (index === 0 && !isLeader) {
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

  // 팀원 추가 핸들러
  const addTeamMember = () => {
    if (teamMembers[teamMembers.length - 1].name.trim() !== "") {
      setTeamMembers([...teamMembers, { name: "", image: null, role: "" }]);
    }
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

    const requiredFields = [
      {
        value: title,
        fieldName: "title",
        message: "프로젝트 제목을 입력해주세요.",
      },
      {
        value: summary,
        fieldName: "summary",
        message: "한줄 소개를 입력해주세요.",
      },
      {
        value: projectType,
        fieldName: "projectType",
        message: "프로젝트 타입을 선택해주세요.",
      },
      {
        value: thumbnail,
        fieldName: "thumbnail",
        message: "썸네일 이미지를 업로드해주세요.",
      },
    ];

    requiredFields.forEach(({ value, fieldName, message }) => {
      if (!value || (typeof value === "string" && value.trim() === "")) {
        errors[fieldName] = message;
      }
    });

    setErrorMessage(errors);

    // 오류가 있으면 false 반환, 없으면 true 반환
    return Object.keys(errors).length === 0;
  };

  // 폼 제출 핸들러
  const handleSubmit = async (e, onSubmit) => {
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

  return {
    // 상태
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
  };
};

export default useProjectForm;
