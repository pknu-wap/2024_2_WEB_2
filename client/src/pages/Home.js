import React, { useState } from 'react';
import Header from '../components/Header';
import Menu from '../components/Menu';
import ContentBox from '../components/ContentBox';


const Home = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <div>
      <Header toggleMenu={toggleMenu} />
      <Menu menuOpen={menuOpen} toggleMenu={toggleMenu} />
      <main>
        <ContentBox />
      </main>
    </div>
  );
};

export default Home;
