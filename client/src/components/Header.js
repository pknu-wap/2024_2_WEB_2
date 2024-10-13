import React from 'react';
import wapLogo from '../assets/img/WAP_white_NoBG.png';


const Header = ({ toggleMenu }) => {
  return (
    <header className="App-header">
      <div className="logo">
        <img className="waplogo" alt="wap" src={wapLogo} />
      </div>
      <div className="menu-icon" onClick={toggleMenu}>
        &#9776;
      </div>
    </header>
  );
};

export default Header;
