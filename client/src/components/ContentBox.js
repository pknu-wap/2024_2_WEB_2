import React from 'react';
import { useNavigate } from 'react-router-dom';

const ContentBox = () => {
  const navigate = useNavigate();

  return (
    <div className="content-box">
      <div className="box" onClick={() => navigate("/web")}>
        <h2>프젝 1</h2>
        <p>어떠어떠한 웹사이트</p>
      </div>
      <div className="box" onClick={() => navigate("/app")}>
        <h2>프젝 2</h2>
        <p>어떠어떠한 앱</p>
      </div>
      <div className="box" onClick={() => navigate("/web")}>
        <h2>프젝 1</h2>
        <p>어떠어떠한 웹사이트</p>
      </div>
      <div className="box" onClick={() => navigate("/app")}>
        <h2>프젝 2</h2>
        <p>어떠어떠한 앱</p>
      </div>
    </div>
    
  );
};

export default ContentBox;
