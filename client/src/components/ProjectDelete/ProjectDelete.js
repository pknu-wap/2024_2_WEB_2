import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { projectApi } from "../../api/project";
import Cookies from "js-cookie";
import LoadingPage from "../LoadingPage";

const ProjectDelete = () => {
  const { projectId } = useParams(); // URL에서 projectId 가져오기
  const navigate = useNavigate();
  const token = Cookies.get("authToken"); // 로그인한 사용자 토큰 가져오기
  const userId = Cookies.get("userId"); // 로그인한 사용자 ID 가져오기
  const [project, setProject] = useState(null); // 프로젝트 데이터
  const [isOwner, setIsOwner] = useState(false); // 소유자인지 확인
  const [isLoggedIn] = useState(!!token); // 로그인 여부 확인

  // API URL
  const apiUrl = `${process.env.REACT_APP_API_BASE_URL}/project/${projectId}`;

  // 프로젝트 상세 정보 가져오기
  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        const data = await projectApi.getProjectDetail(projectId);

        setProject(data); // 프로젝트 데이터 설정

        // 로그인한 사용자와 작성자 비교
        if (token && data.ownerId === parseInt(userId)) {
          setIsOwner(true);
        }
      } catch (error) {
        console.error("프로젝트 정보 가져오기 실패:", error);
        alert("프로젝트 정보를 불러오는 데 실패했습니다.");
        navigate("/"); // 실패 시 메인 페이지로 이동
      }
    };

    fetchProjectDetails();
  }, [apiUrl, token, userId, navigate, projectId]);

  // 프로젝트 삭제 요청
  const handleDelete = async () => {
    if (!window.confirm("정말로 이 프로젝트를 삭제하시겠습니까?")) {
      return;
    }

    try {
      const data = await projectApi.deleteProject(projectId);

      if (data.status === 204) {
        alert("프로젝트가 성공적으로 삭제되었습니다.");
        navigate("/"); // 삭제 후 메인 페이지로 이동
      } else {
        alert("프로젝트 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("프로젝트 삭제 중 오류 발생:", error);
      alert("프로젝트 삭제에 실패했습니다. 다시 시도해주세요.");
    }
  };

  // 프로젝트 로딩 상태 처리
  if (!project) {
    return <LoadingPage />;
  }

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h1>{project.title}</h1>
      <p>{project.content}</p>
      <p>작성자: {project.ownerName}</p>
      {isLoggedIn && isOwner ? (
        <button
          onClick={handleDelete}
          style={{
            backgroundColor: "red",
            color: "white",
            padding: "10px 20px",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          삭제하기
        </button>
      ) : (
        <p>이 프로젝트를 삭제할 권한이 없습니다. </p>
      )}
    </div>
  );
};

export default ProjectDelete;
