import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "../utils/authStorage";
import Menu from "./Menu";
import wapsLogo from "../assets/img/waps_logo.png";

const Header = () => {
  const [userName, setUserName] = useState(Cookies.get("userName") || null);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => setMenuOpen((p) => !p);

  useEffect(() => {
    const token = Cookies.get("authToken");
    const savedUserName = Cookies.get("userName");
    if (token && savedUserName) setUserName(savedUserName);
  }, []);

  const handleLogout = () => {
    Cookies.remove("authToken");
    Cookies.remove("userName");
    setUserName(null);
    navigate("/login");
  };

  const handleLogin = () => {
    navigate("/login", { state: { from: window.location.pathname } });
  };

  return (
    <>
      <header className="App-header">
        <div className="header-inner">
          <div>
            <p
              className="waplogo"
              alt="wap"
              onClick={() => navigate("/ProjectPage")}
              style={{ cursor: "pointer" }}
            >
              <img
                src={wapsLogo}
                alt="WAPs"
                className="waplogo"
                onClick={() => navigate("/ProjectPage")}
                style={{ cursor: "pointer", height: "15px" }} // 크기 조절
              />
            </p>
          </div>

          {/* 아이콘은 CSS에서 absolute로 오른쪽 고정 */}
          <div className="menu-icon" onClick={toggleMenu}>
            {menuOpen ? <p>✕</p> : <p className="menu-bar">☰</p>}
          </div>
        </div>
      </header>

      <Menu
        menuOpen={menuOpen}
        toggleMenu={toggleMenu}
        userName={userName}
        handleLogin={handleLogin}
        handleLogout={handleLogout}
      />
    </>
  );
};

export default Header;
