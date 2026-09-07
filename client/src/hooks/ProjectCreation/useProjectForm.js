// src/hooks/useProjectForm.js
import { useState } from "react";

const useProjectForm = () => {
  // 입력 폼 요소들의 상태
  const [teamName, setTeamName] = useState(null);
  const [title, setTitle] = useState("");
  const [projectType, setProjectType] = useState("");
  const [content, setContent] = useState("");
  const [summary, setSummary] = useState("");

  const [semester, setSemester] = useState("");
  const [password, setPassword] = useState("");
  const [removalList, setRemovalList] = useState([]); // 삭제된 이미지 URL들 저장용

  // 팀장 선택 상태관리
  const [isLeader, setIsLeader] = useState(false);
  const [teamMembers, setTeamMembers] = useState([
    { memberName: "", image: null, memberRole: "" },
  ]);

  const [thumbnail, setThumbnail] = useState(null);
  const [images, setImages] = useState([null, null, null, null]);

  // 입력 필드 글자 수 제한
  const [inputTitle, setInputTitle] = useState(null);
  const [inputContent, setInputContent] = useState(0);
  const [inputSummary, setInputSummary] = useState(0);

  // 기술 스택 선택 상태
  const [selectedTechStacks, setSelectedTechStacks] = useState([]);

  // 업로드 관련 상태
  const [uploading /*, setUploading*/] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // 오류 메시지 상태
  const [errorMessage, setErrorMessage] = useState({});

  // 핸들러 함수들

  // 썸네일 및 일반 이미지 업로드 핸들러
  const handleImgUpload = (file, type, index = null) => {
    // 파일이 없는 경우 또는 파일 타입이 유효하지 않은 경우를 먼저 확인
    if (!file || !file.type || !file.type.startsWith("image/")) {
      //const key = type === "thumbnail" ? "thumbnail" : `image${index}`;

      return;
    }

    if (type === "thumbnail") {
      setThumbnail(file); // 썸네일 설정
    } else if (type === "image") {
      const newImages = [...images]; // 기존 이미지 배열 복사
      newImages[index] = file; // 해당 인덱스에 파일 추가
      setImages(newImages); // 업데이트된 배열 설정
      // console.log(images);
    }

    // 에러 메시지 초기화
    const key = type === "thumbnail" ? "thumbnail" : `image${index}`;
    setErrorMessage((prev) => ({
      ...prev,
      [key]: "",
    }));
  };

  const handleRemoveImage = (type, indexOrNull) => {
    if (type === "thumbnail") {
      // 썸네일은 파일이거나 URL일 수 있음
      if (typeof thumbnail === "string") {
        setRemovalList((prev) => [...prev, thumbnail]);
      }
      setThumbnail(null);
    } else if (type === "image") {
      const removedImage = images[indexOrNull];
      if (typeof removedImage === "string") {
        setRemovalList((prev) => [...prev, removedImage]);
      }

      const updatedImages = [...images];
      updatedImages[indexOrNull] = null;
      setImages(updatedImages);
    }
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
    newTeamMembers[index].memberName = e.target.value;
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
    newTeamMembers[index].memberRole = e.target.value;
    setTeamMembers(newTeamMembers);
  };

  // 팀원 추가 핸들러
  const addTeamMember = () => {
    const lastMember = teamMembers[teamMembers.length - 1];
    // 마지막 팀원의 이름이 비어있지 않고, 역할이 비어있지 않은 경우에만 추가
    if (
      lastMember.memberName.trim() !== "" &&
      lastMember.memberRole.trim() !== ""
    ) {
      setTeamMembers([...teamMembers, { memberName: "", memberRole: "" }]);
      // console.log(teamMembers);
    } else {
      alert("모든 필드를 입력해 주세요."); // 사용자에게 알림 추가
    }
  };

  // 팀원 삭제 핸들러
  const handleRemoveTeamMember = (index) => {
    const newTeamMembers = teamMembers.filter((_, i) => i !== index);
    setTeamMembers(newTeamMembers);
    // console.log(teamMembers);
  };

  // 입력 글자 수 제한 핸들러
  const handleInputLimit = (e) => {
    const { name, value } = e.target;

    switch (name) {
      case "title":
        setInputTitle(value.length);
        break;
      case "content":
        setInputContent(value.length);
        break;
      case "summary":
        setInputSummary(value.length);
        break;
      case "teamName":
        setTeamName(value);
        break;
      // 다른 필드가 있다면 여기에 추가
      default:
        break; // 아무것도 하지 않음
    }
  };

  // 기술 스택 선택 핸들러
  const toggleTechStack = (techStack) => {
    setSelectedTechStacks((prevSelected) => {
      const existing = prevSelected.find(
        (item) => item.techStackName === techStack.techStackName,
      );

      if (existing) {
        return prevSelected.filter(
          (name) => name.techStackName !== techStack.techStackName,
        );
      } else {
        return [...prevSelected, techStack]; // 기술 스택 객체 전체를 추가
      }
    });
  };

  const resetForm = () => {
    setTeamName("");
    setTitle("");
    setProjectType("");
    setContent("");
    setSummary("");
    setSemester("");
    setIsLeader(false);
    setTeamMembers([{ memberName: "", image: null, memberRole: "" }]); // 이름을 일관되게 수정(기존: name, role)
    setThumbnail(null);
    setImages([null, null, null, null]);
    setErrorMessage({});
    setSelectedTechStacks([]);
    setUploadError(null);
    setPassword("");
  };

  // 유효성 검사 함수
  const validateForm = () => {
    const errors = {};

    const requiredFields = [
      {
        value: teamName,
        fieldName: "teamName",
        message: "팀 이름을 입력해주세요.",
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

    return Object.keys(errors).length === 0;
  };

  return {
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
    thumbnail,
    setThumbnail,
    images,
    setImages,
    selectedTechStacks,
    setSelectedTechStacks,
    teamMembers,
    setTeamMembers,
    password,

    inputTitle,
    inputContent,
    inputSummary,
    uploading,
    uploadError,
    errorMessage,

    // 핸들러
    handleImgUpload,
    handleRemoveImage,
    handleMemberNameFocus,
    handleMemberNameChange,
    handleMemberImageUpload,
    handleRoleChange,
    addTeamMember,
    handleRemoveTeamMember,
    handleInputLimit,
    toggleTechStack,
    setPassword,
    resetForm,
    validateForm,

    removalList,
    setRemovalList,
  };
};

export default useProjectForm;
