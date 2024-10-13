import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/menu/Login';
import Project from './pages/menu/Project';
import CreatePage from './pages/menu/CreatePage';
import Vote from './pages/menu/Vote';
import Map from './pages/menu/Map';
import MyPage from './pages/menu/MyPage';
import Web from './pages/project/WebPage';
import AppPage from './pages/project/AppPage';
import './App.css';

function App() {
  return (
    <>
    <body>
      <div class="container">
        <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/CreatePage" element={<CreatePage />} />
          <Route path="/project" element={<Project />} />
          <Route path="/vote" element={<Vote />} />
          <Route path="/map" element={<Map />} />
          <Route path="/MyPage" element={<MyPage />} />

          <Route path="/web" element={<Web />} />
          <Route path="/app" element={<AppPage />} />
        </Routes>
      </Router>
      </div>
    </body>
    
    </>
  );
}

export default App;
