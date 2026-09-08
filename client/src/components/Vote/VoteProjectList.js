import { REQUIRED_VOTE_COUNT } from "../../constants/vote";
import React, { useEffect, useState } from "react";
import styles from "../../assets/ProjectVote.module.css";
import { getCurrentSemester } from "../../utils/dateUtils";
import apiClient from "../../api/client";

const VoteProjectList = ({
  // handleProjectSelect,
  selectedProjects,
  setSelectedProjects,
  isVotedUser,
}) => {
  const [projects, setProjects] = useState([]);
  const semesterInfo = getCurrentSemester();

  const handleProjectSelect = (participants, isVotedUser) => {
    // console.log("클릭됨", participants);

    if (isVotedUser) {
      alert("투표는 변경하실 수 없습니다.");
      return;
    }
    if (selectedProjects.includes(participants)) {
      // 이미 선택된 프로젝트는 해제
      setSelectedProjects(selectedProjects.filter((id) => id !== participants));
    } else {
      // 선택 가능한 개수 미만일 때만 추가
      if (selectedProjects.length < REQUIRED_VOTE_COUNT) {
        setSelectedProjects([...selectedProjects, participants]);
      } else {
        alert(`${REQUIRED_VOTE_COUNT}개의 프로젝트만 선택할 수 있습니다.`); // 사용자에게 알림
      }
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get(`/vote/${semesterInfo}/projects`);

        // console.log("API 응답 데이터:", response.data);

        if (Array.isArray(response.data)) {
          setProjects(response.data);
        }
      } catch (error) {
        console.error("데이터 가져오는 중 오류 발생:", error);
      }
    };

    fetchData();
  }, [semesterInfo]);

  return (
    <div className={styles.project_list_form}>
      {Array.isArray(projects) && projects.length > 0 ? (
        projects.map((project, index) => {
          const isSelected = selectedProjects.includes(project.participants);

          return (
            <div
              key={project.participants}
              className={`${styles.project_list_box} ${
                isSelected ? styles.selected : ""
              }`}
              onClick={() =>
                handleProjectSelect(project.participants, isVotedUser)
              }
            >
              <div className={styles.inform_box}>
                <div style={{ fontSize: 15, position: "absolute", zIndex: 2 }}>
                  {index + 1}
                </div>
                {project.thumbnail && (
                  <div className={styles.project_thumbnail}>
                    <img
                      className={styles.thumbnail_image}
                      alt={project.title}
                      src={project.thumbnail}
                    />
                  </div>
                )}

                <div className={styles.project_title_form}>
                  <h2
                    className={`${styles.title} ${
                      isSelected ? styles.selected_title : ""
                    }`}
                  >
                    {project.title}
                  </h2>
                  <p className={styles.summary}>{project.summary}</p>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <p>프로젝트 데이터를 불러오는 중입니다...</p>
      )}
    </div>
  );
};

export default VoteProjectList;
