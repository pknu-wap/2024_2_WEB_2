import { useState } from "react";

const useProjectvoteForm = () => {
  const [selectedProjects, setSelectedProjects] = useState([]);

  const handleProjectSelect = ({ projectId, isVotedUser }) => {
    console.log("클릭됨", projectId);
    console.log("🔍 isVotedUser 확인:", isVotedUser);

    if (isVotedUser) {
      alert("투표는 변경하실 수 없습니다.");
      return;
    }
    if (selectedProjects.includes(projectId)) {
      // 이미 선택된 프로젝트는 해제
      setSelectedProjects(selectedProjects.filter((id) => id !== projectId));
    } else {
      // 선택된 프로젝트가 3개 미만일 때만 추가
      if (selectedProjects.length < 3) {
        setSelectedProjects([...selectedProjects, projectId]);
      } else {
        alert("최대 3개의 프로젝트만 선택할 수 있습니다."); // 사용자에게 알림
      }
    }
  };

  return {
    selectedProjects,
    handleProjectSelect,
    setSelectedProjects,
  };
};
export default useProjectvoteForm;
