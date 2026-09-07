import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { teamBuildApi } from "../api/team-build";
import LoadingPage from "../components/LoadingPage";

function TeamBuildEntryPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const fetchRole = async () => {
      try {
        const [response, progress] = await Promise.all([
          teamBuildApi.getRole(),
          teamBuildApi.getStatus(),
        ]);
        const role = response?.role;
        if (!active) return;
        if (![1, 2, 3].includes(progress?.round) || !["leader", "member"].includes(role)) {
          throw new Error("팀빌딩 진행 정보가 올바르지 않습니다.");
        }
        if (progress.round === 3) {
          navigate("/team-build/result", { replace: true });
          return;
        }
        const suffix = progress.round === 2 ? "/2nd" : "";
        if (role === "leader") {
          navigate(`/team-build/recruit${suffix}`, { replace: true });
        } else {
          navigate(`/team-build/projects${suffix}`, { replace: true });
        }
      } catch (err) {
        if (!active) return;
        setError("팀빌딩 정보를 불러오지 못했습니다. 다시 시도해주세요.");
      }
    };

    fetchRole();
    return () => {
      active = false;
    };
  }, [navigate]);

  if (error) {
    return (
      <div style={{ padding: "40px 16px", textAlign: "center" }}>
        <div style={{ color: "#fff", marginBottom: "12px" }}>{error}</div>
        <button type="button" onClick={() => window.location.reload()}>
          다시 시도
        </button>
      </div>
    );
  }

  return <LoadingPage />;
}

export default TeamBuildEntryPage;
