import React from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "../../utils/authStorage";
import { projectApi } from "../../api/project";
import styles from "../../assets/ProjectDetail/EditButton.module.css";

const EditButton = ({ projectId }) => {
  const navigate = useNavigate();

  // 수정 버튼 클릭 시 호출되는 함수
  const handleEditClick = async () => {
    const token = Cookies.get("authToken");

    if (!token) {
      alert("로그인이 필요합니다.");
      navigate("/login"); // 로그인 페이지로 이동
      return;
    }

    try {
      // 서버에 수정 권한을 확인하는 요청 보내기
      await projectApi.getprojectUpdatePage(projectId);
      // 권한이 있는 경우 수정 페이지로 이동
      navigate(`/project/edit/${projectId}`);
    } catch (error) {
      if (error.response && error.response.status === 403) {
        alert("수정 권한이 없습니다.");
      } else {
        alert("서버 오류가 발생했습니다.");
      }
    }
  };

  return (
    <button className={styles.edit_button} onClick={handleEditClick}>
      수정하기
    </button>
  );
};

export default EditButton;
