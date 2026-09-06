import React, { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import LoadingPage from "../../components/LoadingPage";

const Callback = () => {
  const navigate = useNavigate();
  const hasHandled = useRef(false);

  const fetchUserInfo = useCallback(
    (token) => {
      fetch(`${process.env.REACT_APP_API_BASE_URL}/user/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to fetch user info.");
          }
          return response.json();
        })
        .then((data) => {
          Cookies.set("userName", data.userName, { expires: 7 });
          Cookies.set("authToken", token, { expires: 7 });

          // 로그인 성공 후 이동한 위치 기억용 쿠키 저장
          Cookies.set("lastPage", "/", { expires: 7 }); // 필요하면 "/" 대신 원하는 경로로 수정

          alert("로그인에 성공했습니다!"); // alert창 없애기
          // navigate("/"); // 또는 "/mystudy", 등 원하는 경로

          return fetch(`${process.env.REACT_APP_API_BASE_URL}/user/role`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to fetch role info.");
          }
          return response.json();
        })
        .then((roleData) => {
          console.log("역할 정보:", roleData);

          // 역할 정보 저장
          if (roleData.role) {
            Cookies.set("userRole", roleData.role, { expires: 7 });
          }

          if (roleData.roleAssigned) {
            // 역할을 이미 선택했다면
            navigate("/ProjectPage"); // 홈페이지로
          } else {
            navigate("/select/role");
          }
        })
        .catch((error) => {
          console.error("사용자 정보를 가져오는 동안 에러 발생:", error);
          alert("사용자 정보를 가져오는 중 오류가 발생했습니다.");
          navigate("/login");
        });
    },
    [navigate],
  );

  useEffect(() => {
    if (hasHandled.current) return;
    hasHandled.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (params.get("code") === "AUTH_OAUTH2_FAILURE") {
      alert("카카오 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.");
      navigate("/login");
    } else if (token) {
      fetchUserInfo(token);
    } else {
      alert("로그인 토큰이 없습니다. 다시 로그인해주세요.");
      navigate("/login");
    }
  }, [navigate, fetchUserInfo]);

  return <LoadingPage />;
};

export default Callback;
