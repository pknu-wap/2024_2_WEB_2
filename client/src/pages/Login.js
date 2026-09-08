import "../assets/Login.css";
import wapsLogo from "../assets/img/waps_logo.png";
import img from "../assets/img/pngwing.com.png";
import { useNavigate } from "react-router-dom";
import Cookies from "../utils/authStorage";
import { authApi } from "../api/auth";

const Login = () => {
  const navigate = useNavigate();
  const isLoggedIn = !!Cookies.get("authToken");

  const handleKakaoLogin = () => {
    try {
      const redirectUri = encodeURIComponent(
        `${window.location.origin}/oauth/callback`,
      );
      const kakaoLoginUrl = authApi.getKakaoLoginUrl(redirectUri);
      window.location.href = kakaoLoginUrl;
    } catch (error) {
      console.error("Error during Kakao login redirect:", error);
      alert("로그인 페이지로 이동하지 못했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  const handleProceedWithoutLogin = () => {
    navigate("/"); // 메인 페이지로 이동
  };

  const handleLogout = () => {
    Cookies.remove("authToken");
    Cookies.remove("userName");
    alert("로그아웃 되었습니다.");
    navigate("/login");
  };

  return (
    <div className="login-page">
      <button className="close-button" onClick={() => navigate("/ProjectPage")}>
        &times;
      </button>
      <div>
        <img
          src={wapsLogo}
          alt="WAPs"
          className="waplogo"
          onClick={() => navigate("/ProjectPage")}
          style={{ cursor: "pointer", height: "66px", opacity: 0.7 }} // 크기 조절
        />
      </div>
      <div className="login-caption">
        <p>WAP에서의 프로젝트를 만나보세요</p>
      </div>
      <div className="login-buttons">
        {isLoggedIn ? (
          <button className="login-button logout" onClick={handleLogout}>
            로그아웃
          </button>
        ) : (
          <>
            <button className="login-button kakao" onClick={handleKakaoLogin}>
              <img src={img} alt="Kakao Logo" className="Kakao-image" />
              <span>카카오로 로그인</span>
            </button>
            <button
              className="login-button no-login"
              onClick={handleProceedWithoutLogin}
            >
              <span>로그인 없이 진행</span>
            </button>
            <div className="login-mini-caption">
              WAPs는 카카오로 로그인이 가능합니다.
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
