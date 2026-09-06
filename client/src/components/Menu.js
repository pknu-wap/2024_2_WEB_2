import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "../utils/authStorage";
import { FaChevronRight } from "react-icons/fa";
import "../assets/Menu.css";

const Menu = ({ menuOpen, toggleMenu, userName }) => {
  const navigate = useNavigate();

  const [canNavigate, setCanNavigate] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!!Cookies.get("authToken"));
  const [userRole, setUserRole] = useState(Cookies.get("userRole") || null);

  // 메뉴 열릴 때 배경 스크롤만 막고, 화면 밀림(shift) 방지
  useEffect(() => {
    if (!menuOpen) return;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [menuOpen]);

  const handleNavigationWithAuth = (path) => {
    const token = Cookies.get("authToken");
    if (!token) {
      alert("해당 페이지는 로그인을 해야 접속 가능합니다.");
      navigate("/login");
    } else {
      navigate(path);
      toggleMenu();
    }
  };

  const handleAdminNavigate = () => {
    const token = Cookies.get("authToken");
    const role = Cookies.get("userRole");

    if (!token) {
      alert("해당 페이지는 로그인을 해야 접속 가능합니다.");
      navigate("/login");
    } else if (role !== "ROLE_ADMIN") {
      alert("관리자 권한이 없습니다.");
    } else {
      Cookies.set("previousPage", window.location.pathname, { expires: 1 });
      navigate("/admin/vote");
      toggleMenu();
    }
  };

  useEffect(() => {
    const token = Cookies.get("authToken");
    const role = Cookies.get("userRole");
    setIsLoggedIn(!!token);
    setUserRole(role);

    const allowedDate = new Date("2024-11-29T18:00:00");
    const now = new Date();

    if (now >= allowedDate) {
      setCanNavigate(true);
    } else {
      const timeUntilAllowed = allowedDate - now;
      setTimeout(() => setCanNavigate(true), timeUntilAllowed);
    }
  }, []);

  const handleVotePageNavigate = () => {
    if (canNavigate) handleNavigationWithAuth("/vote");
    else alert("투표는 로그인 이후에 가능합니다.");
  };

  const handleLogout = () => {
    Cookies.remove("authToken");
    Cookies.remove("userName");
    Cookies.remove("userRole");
    setIsLoggedIn(false);
    setUserRole(null);
    alert("로그아웃 되었습니다.");
    toggleMenu();
    navigate("/");
  };

  return (
    <div className="menuContainer">
      {menuOpen && (
        <nav className="menu">
          <div className="menu-content">
            {isLoggedIn && userName ? (
              <p className="welcome-message">{userName}님 환영합니다.</p>
            ) : (
              <p className="welcome-message">로그인을 해주십시오.</p>
            )}

            <h2 className="menu-title">MENU PAGE</h2>

            <div className="menu-section">
              <h3 className="section-title">PROJECTS</h3>
              <div className="menu-items">
                <button
                  className="menu-item"
                  onClick={() => {
                    navigate("/ProjectPage");
                    toggleMenu();
                  }}
                >
                  <span>프로젝트 Projects</span>
                  <span className="arrow">
                    <FaChevronRight />
                  </span>
                </button>

                <button
                  className="menu-item"
                  onClick={() => handleNavigationWithAuth("/project/create")}
                >
                  <span>프로젝트 만들기 Create Project</span>
                  <span className="arrow">
                    <FaChevronRight />
                  </span>
                </button>
              </div>
            </div>

            <div className="menu-section">
              <h3 className="section-title">CALENDAR</h3>
              <div className="menu-items">
                <button
                  className="menu-item"
                  onClick={() => {
                    navigate("/calendar");
                    toggleMenu();
                  }}
                >
                  <span>캘린더 Calendar</span>
                  <span className="arrow">
                    <FaChevronRight />
                  </span>
                </button>
              </div>
            </div>

            <div className="menu-section">
              <h3 className="section-title">TEAMBUILDING</h3>
              <div className="menu-items">
                <button
                  className="menu-item"
                  onClick={() => handleNavigationWithAuth("/team-build")}
                >
                  <span>팀빌딩 Team Building</span>
                  <span className="arrow">
                    <FaChevronRight />
                  </span>
                </button>

                <button
                  className="menu-item"
                  onClick={() => navigate("/team-build/result")}
                >
                  <span>팀빌딩 결과 Team Building Result</span>
                  <span className="arrow">
                    <FaChevronRight />
                  </span>
                </button>
              </div>
            </div>

            {userRole === "ROLE_ADMIN" && (
              <div className="menu-section">
                <h3 className="section-title">ADMINISTRATOR</h3>
                <div className="menu-items">
                  <button className="menu-item" onClick={handleAdminNavigate}>
                    <span>임원진 페이지 Administrator Page</span>
                    <span className="arrow">
                      <FaChevronRight />
                    </span>
                  </button>
                </div>
              </div>
            )}

            <div className="menu-section">
              <h3 className="section-title">VOTE</h3>
              <div className="menu-items">
                <button className="menu-item" onClick={handleVotePageNavigate}>
                  <span>투표 Vote</span>
                  <span className="arrow">
                    <FaChevronRight />
                  </span>
                </button>
                <button
                  className="menu-item"
                  onClick={() => {
                    navigate("/vote/result");
                    toggleMenu();
                  }}
                >
                  <span>투표 결과 Vote Result</span>
                  <span className="arrow">
                    <FaChevronRight />
                  </span>
                </button>
              </div>
            </div>

            <button
              className="logout-button"
              onClick={() => {
                if (isLoggedIn) handleLogout();
                else {
                  toggleMenu();
                  navigate("/login");
                }
              }}
            >
              {isLoggedIn ? "로그아웃 Logout" : "로그인 Login"}
            </button>
          </div>
        </nav>
      )}
    </div>
  );
};

export default Menu;
