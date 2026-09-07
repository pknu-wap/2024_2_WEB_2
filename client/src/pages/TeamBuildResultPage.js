import React, { useState, useEffect, useMemo } from "react";
import Header from "../components/Header";
import Menu from "../components/Menu";
import FloatingButton from "../components/FloatingButton";
import { teamBuildApi } from "../api/team-build";
import styles from "../assets/TeamBuildResult.module.css";
import LoadingPage from "../components/LoadingPage";

const TeamBuildResultPage = () => {
  // 상태 관리
  const [teams, setTeams] = useState([]); // 팀 상태
  const [unassigned, setUnassigned] = useState([]); // 미배정자 상태
  const [isLoading, setIsLoading] = useState(true); // 로딩 상태
  const [error, setError] = useState(null); // 에러 상태
  const [searchQuery, setSearchQuery] = useState(""); // 검색창 문자열 상태
  const [menuOpen, setMenuOpen] = useState(false);
  const [sortBy, setSortBy] = useState("default");

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  // 데이터 로딩
  useEffect(() => {
    const fetchTeamBuildResult = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await teamBuildApi.getTeamBuildResults();
        setTeams(response.results || []);
        setUnassigned(response.unassigned || []);
      } catch (err) {
        console.error("Failed to fetch team build result:", err);
        setError(
          "데이터를 불러오는데 실패하였습니다. 해당 학기에 결과가 없을 수 있습니다.",
        );
        setTeams([]); // 에러 발생 시 기존 데이터 초기화
        setUnassigned([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTeamBuildResult();
  }, []);

  // 검색 및 정렬 로직
  const filteredAndSortedTeams = useMemo(() => {
    const filtered = teams.filter((team) => {
      const leaderName = team.leader?.name || "";
      const leaderPos = team.leader?.position || "";
      const memberNames = team.members?.map((m) => m.name).join(" ") || "";
      const memberPos = team.members?.map((m) => m.position).join(" ") || "";

      const searchKey =
        `${team.teamName} ${leaderName} ${memberNames} ${leaderPos} ${memberPos}`.toLowerCase();
      return searchKey.includes(searchQuery.toLowerCase());
    });

    if (sortBy === "name") {
      return [...filtered].sort((a, b) => {
        return a.teamName.localeCompare(b.teamName, "ko");
      });
    }

    // 'default' 상태이거나 다른 상태일 경우, 필터링된 원본 순서(API 순서) 반환
    return filtered;
  }, [teams, searchQuery, sortBy]);

  // 미배정자 정렬
  const filteredUnassigned = useMemo(() => {
    return unassigned.filter((member) => {
      const searchKey =
        `${member.name} ${member.position} 미배정`.toLowerCase();
      return searchKey.includes(searchQuery.toLowerCase());
    });
  }, [unassigned, searchQuery]);

  // 팀 명단 복사 이벤트 헨들러
  const handleCopyRoster = (team) => {
    const rosterText = `팀명: ${team.teamName} / 팀장: ${team.leader.name}${team.leader.position ? `·${team.leader.position}` : ""} / 팀원: ${team.members.map((m) => `${m.name}${m.position ? `·${m.position}` : ""}`).join(", ")}`;

    navigator.clipboard
      .writeText(rosterText)
      .then(() => {
        alert("팀 명단이 복사되었습니다!");
      })
      .catch((err) => {
        console.error("Could not copy text: ", err);
      });
  };

  // 미배정자 이동 헨들러
  const handleMoveUnassigned = () => {
    document
      .getElementById("scrollTarget")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSortByName = () => {
    setSortBy((prevSortBy) => (prevSortBy === "name" ? "default" : "name"));
  };
  // 렌더링
  const renderContent = () => {
    if (isLoading) {
      return <LoadingPage />;
    }
    if (error) {
      return <div className={styles.empty}>{error}</div>;
    }
    return (
      <>
        {/* 팀 카드 그리드 */}
        {filteredAndSortedTeams.length === 0 && searchQuery === "" ? (
          <div className={styles.empty}>
            이번 학기의 팀 빌딩 결과가 없습니다.
          </div>
        ) : filteredAndSortedTeams.length === 0 && searchQuery !== "" ? (
          <div className={styles.empty}>검색 결과가 없습니다.</div>
        ) : (
          <div className={styles.grid}>
            {filteredAndSortedTeams.map((team) => (
              <div className={styles.card} key={team.projectId}>
                <div className={styles.cardHeader}>
                  <div className={styles.nameSpace}>
                    <span className={styles.teamName}>{team.teamName}</span>
                    <span className={styles.badge}>
                      멤버 {team.members.length}명
                    </span>
                  </div>

                  <div className={styles.muted}>ID #{team.projectId}</div>
                </div>

                <div className={styles.members}>
                  <div>
                    <strong>팀장 |</strong>
                    <span> {team.leader.name}</span>
                    {team.leader.position && (
                      <span className={styles.muted}>
                        · {team.leader.position}
                      </span>
                    )}
                  </div>
                  <div>
                    <strong>팀원 |</strong>
                    {team.members.map((m) => (
                      <span key={m.name}>
                        <span> {m.name}</span>
                        {m.position && (
                          <span className={styles.roll}> {m.position}</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                <div className={styles.footer}>
                  <div className={styles.summary}>
                    {team.summary && (
                      <div className={styles.muted}>{team.summary}</div>
                    )}
                    <div className={styles.muted}>
                      총 인원: <b>{1 + team.members.length}</b>명 (팀장 포함)
                    </div>
                  </div>

                  <div className={styles.actions}>
                    <button
                      className={styles.copy}
                      onClick={() => handleCopyRoster(team)}
                    >
                      명단복사
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 미배정 지원자 그리드 */}
        <div id="scrollTarget" className={styles.sectionTitle}>
          미배정 지원자
        </div>
        <div className={styles.sectionSub}>
          총 <b>{filteredUnassigned.length}</b>명
        </div>

        {filteredUnassigned.length === 0 ? (
          <div className={styles.empty}>
            모든 지원자가 팀에 배정되었습니다 🎉
          </div>
        ) : (
          <div className={styles.grid}>
            {filteredUnassigned.map((m) => (
              <div className={styles.card} key={m.name}>
                <div className={styles.cardHeader}>
                  <div className={styles.notMatched}>
                    <span>{m.name}</span>
                    <span className={styles.badge}>{m.position}</span>
                  </div>
                  <div style={{ fontSize: "10px" }}>미배정</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <div className={styles.container}>
      <Header toggleMenu={toggleMenu} />
      <Menu menuOpen={menuOpen} toggleMenu={toggleMenu} />
      <main>
        <div className={styles.container}>
          {/* 헤더 */}
          <div className={styles.header}>
            <div className={styles.headerInner}>
              <div className={styles.titleSection}>
                <div className={styles.pageTitle}>TEAM BUILDING RESULTS</div>
                <div className={styles.titleSub}>팀빌딩 결과를 확인하세요</div>
              </div>

              <div className={styles.toolbar}>
                <div>
                  <div className={styles.search}>
                    <input
                      type="text"
                      placeholder="팀명/팀장/팀원/미배정 검색…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className={styles.sorts}>
                  <button
                    className={`${styles.btn} ${sortBy === "name" ? styles.activeSort : ""}`}
                    onClick={handleSortByName}
                  >
                    팀명순
                  </button>
                  <button className={styles.btn} onClick={handleMoveUnassigned}>
                    미배정
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.contentBox}>
            {renderContent()}
            <FloatingButton />
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeamBuildResultPage;
