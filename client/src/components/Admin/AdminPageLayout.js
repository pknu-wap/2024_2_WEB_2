import { useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import styles from "../../assets/Admin/AdminPageLayout.module.css";
import SideBar from "./SideBar";
import Cookies from "../../utils/authStorage";

// 어드민 페이지 공용 레이아웃
const AdminPageLayout = () => {
  // 유저 이름 저장
  const [userName, setUserName] = useState(Cookies.get("userName") || null);
  // 모바일 사이드바 열림 상태 관리
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 유저 이름 가져오기
  useEffect(() => {
    const token = Cookies.get("authToken");
    const savedUserName = Cookies.get("userName");
    if (token && savedUserName) setUserName(savedUserName);
  }, []);

  const navigate = useNavigate();

  const handleExit = () => {
    // 이전 위치를 가져와서 뒤로 돌려보냄
    const previousPage = Cookies.get("previousPage") || "/ProjectPage";
    Cookies.remove("previousPage"); // 사용 후 쿠키 삭제
    navigate(previousPage);
  };

  // 모바일 메뉴 토글
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // 모바일 메뉴 닫기
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className={styles.container}>
      {/* 헤더 */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          {/* 햄버거 아이콘 (CSS에서 1024px 이하일 때만 보임) */}
          <div className={styles.hamburger} onClick={toggleMobileMenu}>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span className={styles.logo} onClick={handleExit}>
            WAPs
          </span>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.adminUser}>
            <span>관리자 {userName} 님</span>
          </div>
          <div className={styles.exitBtn} onClick={handleExit}>
            ✕
          </div>
        </div>
      </div>

      {/* 메인 */}
      <div className={styles.main}>
        {/* 데스크탑용 사이드바 (CSS에서 화면 작아지면 숨김) */}
        <div className={styles.sidebarWrapper}>
          <SideBar />
        </div>

        {/* 모바일용 사이드바 (상태값에 따라 렌더링) */}
        {isMobileMenuOpen && (
          <>
            {/* 배경 클릭 시 닫기 위한 오버레이 */}
            <div
              className={styles.mobileSidebarOverlay}
              onClick={closeMobileMenu}
            />
            <div className={styles.mobileSidebarContent}>
              <SideBar />
            </div>
          </>
        )}

        <div className={styles.contentsBox}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminPageLayout;
