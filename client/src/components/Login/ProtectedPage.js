import React, { useEffect, useState } from "react";
import { userApi } from "../../api/user";
import Cookies from "../../utils/authStorage";

const ProtectedPage = () => {
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      const token = Cookies.get("authToken");
      if (!token) {
        console.error("No token found. Redirecting to login...");
        window.location.href = "/login";
        return;
      }

      try {
        const data = await userApi.getMe();

        setUserInfo(data);
        console.log("User info received:", data);
      } catch (error) {
        console.error("Failed to fetch user info:", error);
        window.location.href = "/login";
      }
    };

    fetchUserInfo();
  }, []);

  if (!userInfo) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      <h2>사용자 정보</h2>
      <p>이름: {userInfo.name}</p>
      <p>이메일: {userInfo.email}</p>
    </div>
  );
};

export default ProtectedPage;
