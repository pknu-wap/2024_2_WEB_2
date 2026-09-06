import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import Cookies from "../../utils/authStorage";

const PrivateRoute = ({ requireRole = null }) => {
  const token = Cookies.get("authToken");
  const role = Cookies.get("userRole");

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (requireRole && role !== requireRole) {
    alert(`${requireRole} 권한이 필요합니다.`);
    return <Navigate to="/ProjectPage" />;
  }
  return <Outlet />;
};

export default PrivateRoute;
