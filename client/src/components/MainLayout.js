import { Outlet, useMatch } from "react-router-dom";
import "../App.css"; // .container 스타일을 가져오기 위해 임포트

const MainLayout = () => {
  const isSplashPage = useMatch("/");
  const isProjectPage = useMatch("/ProjectPage");
  const hidePageShadow = isSplashPage || isProjectPage;

  return (
    <div className={`container${hidePageShadow ? " container--no-shadow" : ""}`}>
      <Outlet />{" "}
      {/* 이 컴포넌트를 부모로 하는 자식 라우트들이 여기에 렌더링됨 */}
    </div>
  );
};

export default MainLayout;
