import { useLocation, useNavigate } from "react-router-dom";
import styles from "../../assets/Admin/SideBar.module.css";
import { IconVote, IconTeamBuild, IconPermission, IconPlan } from "./icons";

// 어드민 페이지 사이드바 컴포넌트
const SideBar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // SVG 컴포넌트에 직접 전달할 색상 값
  const activeColor = "black";
  const defaultColor = "white";

  // 페이지별 버튼과 경로를 매핑
  const buttons = [
    { text: "투표 관리", path: "/admin/vote", icon: IconVote },
    { text: "팀빌딩 관리", path: "/admin/teambuild", icon: IconTeamBuild },
    {
      text: "3차 팀빌딩",
      path: "/admin/teambuild/3rd",
      icon: IconTeamBuild,
    },
    {
      text: "사용자 권한 관리",
      path: "/admin/permission",
      icon: IconPermission,
    },
    { text: "주요 행사 일정 관리", path: "/admin/plan", icon: IconPlan },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.title}>
        <div className={styles.eng}>ADMINISTRATOR PAGE</div>
        <div className={styles.kr}>관리자 페이지</div>
      </div>
      <div className={styles.pageBtn}>
        {buttons.map((button) => {
          // 현재 경로와 버튼 경로가 일치하는지 확인
          const isActive = location.pathname === button.path;
          const IconComponent = button.icon;

          // 활성 상태에 따라 아이콘에 전달할 색상 결정
          const iconColor = isActive ? activeColor : defaultColor;

          return (
            <button
              key={button.text}
              className={isActive ? styles.active : ""}
              onClick={() => navigate(button.path)}
            >
              {/* 아이콘 컴포넌트를 렌더링하고 color prop과 size 전달 */}
              <IconComponent color={iconColor} size="1" />
              {button.text}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SideBar;
