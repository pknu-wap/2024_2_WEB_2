import { MIN_DEV_ACCOUNT_NUMBER, MAX_DEV_ACCOUNT_NUMBER } from "../constants/devLogin";
import { useEffect, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { getDevSessionId, saveDevSession } from "../utils/authStorage";
import { authApi } from "../api/auth";
import LoadingPage from "../components/LoadingPage";
import { isDevLoginEnabled } from "../utils/devLogin";

export default function LoginDev() {
  const [searchParams] = useSearchParams();
  const requestedId = searchParams.get("id");
  const enabled = isDevLoginEnabled();
  const started = useRef(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled || started.current) return;
    started.current = true;

    if (requestedId !== null && (!/^[0-9]+$/.test(requestedId) || Number(requestedId) < MIN_DEV_ACCOUNT_NUMBER || Number(requestedId) > MAX_DEV_ACCOUNT_NUMBER)) {
      setError(`테스트 계정 번호는 ${MIN_DEV_ACCOUNT_NUMBER}~${MAX_DEV_ACCOUNT_NUMBER} 사이의 정수여야 합니다.`);
      return;
    }

    Promise.resolve().then(() => authApi.loginDev(getDevSessionId(),
      requestedId === null ? undefined : Number(requestedId))).then((session) => {
      if (!session.accessToken || !session.userName || !session.expiresAt) throw new Error("Invalid login response");
      saveDevSession(session);
      // Reload shared layouts so the assigned account name is immediately reflected.
      window.location.replace("/ProjectPage");
    }).catch((failure) => setError(failure.response?.status === 409
      ? failure.response.data?.message || "테스트 계정이 모두 사용 중입니다. 잠시 후 다시 시도해주세요."
      : "개발 로그인에 실패했습니다. 잠시 후 다시 시도해주세요."));
  }, [enabled, requestedId]);

  if (!enabled) return <Navigate to="/login" replace />;
  if (error) return (
    <div className="login-page">
      <p role="alert">{error}</p>
      <button onClick={() => window.location.reload()}>다시 시도</button>
    </div>
  );
  return <LoadingPage />;
}
