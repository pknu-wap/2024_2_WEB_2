import React from 'react';
import { useNavigate } from 'react-router-dom';

const Menu = ({ menuOpen, toggleMenu }) => {
  const navigate = useNavigate();

  return (
    <>
    <div class="menuContainer">
      {menuOpen && (
          <nav className="menu">
            <div>
              <ul>
                <li onClick={() => { navigate("/login"); toggleMenu(); }}>로그인</li>
                <li onClick={() => { navigate("/project"); toggleMenu(); }}>프로젝트</li>
                <li onClick={() => { navigate("/CreatePage"); toggleMenu(); }}>프로젝트 생성</li>
                <li onClick={() => { navigate("/vote"); toggleMenu(); }}>투표</li>
                <li onClick={() => { navigate("/map"); toggleMenu(); }}>위치도</li>
                <li onClick={() => { navigate("/MyPage"); toggleMenu(); }}>마이페이지</li>
              </ul>
            </div>
          </nav>
        )}
    </div>
    </>
  );
};

export default Menu;
