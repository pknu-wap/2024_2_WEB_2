import React, { useState, useEffect, useRef } from "react";
import { voteApi } from "../api/vote";
import { userApi } from "../api/user";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Menu from "../components/Menu";
import VoteForm from "../components/Vote/VoteForm";
import FloatingButton from "../components/FloatingButton";
import Cookies from "../utils/authStorage";

// 분기를 결정함.
// 현재 투표 기간인지에 따라 분기 구별함.
const VotePage = () => {
  // apiUrl 제거, voteApi 사용

  // 토큰 받아오기
  const token = Cookies.get("authToken");
  const [menuOpen, setMenuOpen] = useState(false);

  // 현재 투표기간인지 판단하는 함수
  const [isOpen, setIsOpen] = useState(false);

  // 투표했는지 여부의 초기값은 일단 false
  const [isVotedUser, setIsVotedUser] = useState(false);
  const navigate = useNavigate();
  const hasValidated = useRef(false);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  useEffect(() => {
    if (hasValidated.current) return;
    hasValidated.current = true;

    const validate = async () => {
      // 토큰 여부 확인
      if (!token) {
        alert("로그인이 필요합니다.");
        navigate("/login");
        return;
      }
      // 토큰 만료 여부 확인
      try {
        await userApi.getMe();
      } catch (error) {
        alert("로그인 유효기간이 만료되었습니다. 재로그인 해주세요.");
        navigate("/login");
        return;
      }

      // 토큰이 유효하면 그다음 투표 기간 확인
      try {
        const response = await voteApi.getVoteNow();
        setIsOpen(response.isOpen);
        setIsVotedUser(response.isVotedUser);

        // 투표 기간이 아닌 경우 즉시 안내 후 이동
        if (!response.isOpen) {
          alert("투표 기간이 아닙니다.\n투표 결과 페이지로 이동합니다.");
          navigate("/vote/result");
        }
      } catch (error) {
        alert("투표가 존재하지 않습니다.");
        navigate("/ProjectPage");
      }
    };
    validate();
  }, [navigate, token]);

  return (
    <div className="container">
      <Header toggleMenu={toggleMenu} />

      <Menu menuOpen={menuOpen} toggleMenu={toggleMenu} />
      <main>
        {/* <VoteForm isVotedUser={isVotedUser} /> */}
        {/* 투표 기간일 때만 렌더링 */}
        {isOpen && <VoteForm isVotedUser={isVotedUser} />}
      </main>
      <FloatingButton />
    </div>
  );
};

export default VotePage;
