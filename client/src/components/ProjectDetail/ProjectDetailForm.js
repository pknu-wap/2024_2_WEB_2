import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { projectApi } from "../../api/project";
import Cookies from "../../utils/authStorage";
import styles from "../../assets/ProjectDetail/ProjectDetailForm.module.css";
import dogImage from "../../assets/img/dog.png";
import EditButton from "./EditButton";
import Comments from "./Comments/Comments";
import CommentsList from "./Comments/CommentsList";
import LoadingPage from "../../components/LoadingPage";

const formatSemester = (semester) => {
  if (!semester) {
    return { year: "연도 없음", semester: "학기 정보 없음" };
  }

  const [year, semesterValue] = semester.split("-");
  return {
    year: year || "연도 없음",
    semester: semesterValue ? `${Number(semesterValue)}학기` : "학기 정보 없음",
  };
};

const ProjectDetailForm = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const token = Cookies.get("authToken"); // 로그인한 사용자 토큰
  const [canManage, setCanManage] = useState(false);
  const [projectData, setProjectData] = useState(null); // 프로젝트 데이터
  const [isDataLoaded, setIsDataLoaded] = useState(false); // 데이터 로딩 완료 여부

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        const data = await projectApi.getProjectDetail(projectId);
        setProjectData(data);
        console.log("API 응답 데이터:", data);

        // 서버가 판단한 게시물 수정·삭제 권한
        setCanManage(data.canManage === true);

        // 일정 시간 후 데이터 렌더링을 완료하도록 설정
        new Promise((resolve) => setTimeout(resolve, 400)).then(() => {
          setIsDataLoaded(true);
        });
      } catch (error) {
        alert("프로젝트 정보를 불러오는 데 실패했습니다.");
        navigate("/");
      }
    };
    fetchProjectDetails();
  }, [projectId, navigate]);

  const handleDelete = async () => {
    if (!window.confirm("정말로 이 프로젝트를 삭제하시겠습니까?")) {
      return;
    }
    try {
      await projectApi.deleteProject(projectId);
      alert("프로젝트가 성공적으로 삭제되었습니다.");
      navigate("/");
    } catch (error) {
      alert("프로젝트 삭제에 실패했습니다. 다시 시도해주세요.");
    }
  };

  // 줄바꿈 렌더링
  const formatText = (text) => {
    if (!text) return text;
    return text.split("\n").map((line, index) => (
      <React.Fragment key={index}>
        {line}
        <br />
      </React.Fragment>
    ));
  };

  if (!projectData || !isDataLoaded) {
    return <LoadingPage />;
  }

  const semesterInfo = formatSemester(projectData.semester);

  return (
    <div className={`${styles.project_detail_form} ${styles.mount1}`}>
      {/* 프로젝트 썸네일 */}
      <img
        className={styles.thumnail_image}
        src={projectData.thumbnail || dogImage}
        alt="Project Thumbnail"
      />

      {/* 프로젝트 제목 및 정보 */}
      <div className={styles.project_detail_box}>
        <div className={styles.project_detail_title}>
          <div className={styles.title}>{projectData.title || "제목 없음"}</div>
          <div className={styles.project_info}>
            <div className={styles.project_year_info}>
              <div className={styles.projectYear}>{semesterInfo.year}</div>
              <div>-</div>
              <div className={styles.semester}>{semesterInfo.semester}</div>
            </div>
            <div className={styles.project_type_info}>
              {projectData.projectType || "프로젝트 타입 없음"}
            </div>
          </div>
        </div>

        {/* 프로젝트 내용 */}
        <div className={styles.project_detail_content}>
          <div className={styles.summary}>
            {formatText(projectData.summary) || "요약 정보 없음"}
          </div>
          <div className={styles.content}>
            {formatText(projectData.content) || "내용이 없습니다."}
          </div>
        </div>
      </div>

      {/* 이미지 섹션 */}
      <div className={styles.images}>
        {projectData.images && projectData.images.length > 0 ? (
          projectData.images.map((image, index) => (
            <img
              key={index}
              className={styles.image}
              src={image.imageFile || dogImage}
              alt={`이미지 ${index + 1}`}
            />
          ))
        ) : (
          <img className={styles.image} src={dogImage} alt="기본 이미지" />
        )}
      </div>

      {/* 팀원 정보 */}
      <div className={styles.projectListInfo}>
        <div className={styles.teamMembers}>
          <label>Team</label>
          <div className={styles.member}>
            {projectData.teamMember && projectData.teamMember.length > 0 ? (
              projectData.teamMember.map(
                (member, index) =>
                  member.memberName && member.memberRole ? ( // 이름과 역할이 있는 경우만 렌더링
                    <div className={styles.memberInfo} key={index}>
                      <div className={styles.memberName}>
                        {member.memberName}
                      </div>
                      <div className={styles.memberRole}>
                        {member.memberRole}
                      </div>
                    </div>
                  ) : null, // 이름이나 역할이 없는 경우 렌더링하지 않음
              )
            ) : (
              <p>팀원 정보가 없습니다.</p>
            )}
          </div>
        </div>

        {/* 기술 스택 정보 */}
        <div className={styles.techStacks}>
          <label>Stack</label>
          <div className={styles.techStack}>
            {projectData.techStack && projectData.techStack.length > 0 ? (
              projectData.techStack.map((techStack, index) => (
                <div className={styles.techStackInfo} key={index}>
                  <div className={styles.techStackName}>
                    {techStack.techStackName || "스택 이름 없음"}
                  </div>
                  <div className={styles.techStackType}>
                    {techStack.techStackType || "스택 타입 없음"}
                  </div>
                </div>
              ))
            ) : (
              <p>기술 스택 정보가 없습니다.</p>
            )}
          </div>
        </div>
      </div>

      <div className={styles.buttons}>
        {canManage && token && (
          <>
            <button onClick={handleDelete} className={styles.delete_button}>
              삭제하기
            </button>
            {/* 수정 버튼 */}
            <EditButton projectId={projectId} />
          </>
        )}
      </div>

      <div>
        <hr
          style={{
            width: "100%",
            margin: "30px 0",
            border: "1px solid #363636",
          }}
        />
        <Comments projectId={projectId} />
        {projectData.comments && projectData.comments.length > 0 && (
          <>
            <hr
              style={{
                width: "90%",
                margin: "0 auto",
                marginBottom: "20px",
                border: "1px solid #363636",
              }}
            />
            <CommentsList comments={projectData.comments} />
          </>
        )}
      </div>
      <div className={styles.footer}></div>
    </div>
  );
};

export default ProjectDetailForm;
