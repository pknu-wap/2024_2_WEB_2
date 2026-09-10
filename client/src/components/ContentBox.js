import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { projectApi } from "../api/project";
import "../App.css";
import "../assets/Contentbox.css";
import LoadingPage from "./LoadingPage";
import useSemester from "../hooks/useSemester";

/* 알약 버튼 목록 (UI 전용) */
const TYPE_OPTIONS = [
  { label: "전체", value: "All" },
  { label: "웹", value: "Web" },
  { label: "앱", value: "App" },
  { label: "게임", value: "Game" },
  { label: "임베디드", value: "기타" },
];

// 프로젝트 타입을 한글로 변환하는 함수
const getTypeLabel = (type) => {
  const typeMap = {
    web: "웹",
    app: "앱",
    game: "게임",
    기타: "기타",
  };
  return typeMap[type?.toLowerCase?.()] || type;
};

/* 색상용 클래스 키 */
const typeKey = (t) => {
  const key = (t || "").toString().toLowerCase();
  const map = { web: "web", app: "app", game: "game", 기타: "etc" };
  return map[key] || "etc";
};

const toSemester = (year, semester) =>
  `${year}-${String(semester).padStart(2, "0")}`;

const normalizeSemesterParam = (semester, projectYear, fallback) => {
  if (semester?.includes("-")) {
    return semester;
  }

  if (semester && projectYear) {
    return toSemester(projectYear, semester);
  }

  return fallback;
};

const formatSemesterLabel = (semester) => {
  const [year, semesterValue] = semester.split("-");
  return `${("0" + (Number(year) - 2000)).slice(-2)}년 ${Number(semesterValue)}학기`;
};

const ContentBox = () => {
  const [filter, setFilter] = useState("All");
  const [yearAccordionOpen, setYearAccordionOpen] = useState(false);
  const currentYear = new Date().getFullYear();

  const [searchParams, setSearchParams] = useSearchParams();

  // useSemester 훅을 사용하여 초기 학기/년도 상태 설정
  const semesterString = useSemester();

  // URL에서 값을 읽어와 초기 상태 설정, 없으면 useSemester 값 사용
  const initialSemester = normalizeSemesterParam(
    searchParams.get("semester"),
    searchParams.get("projectYear"),
    semesterString,
  );

  const [semesterFilter, setSemesterFilter] = useState(initialSemester);

  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await projectApi.getProjectList(semesterFilter);

        if (Array.isArray(response.projectsResponse)) {
          setData(response.projectsResponse);
          setFilteredData(response.projectsResponse);
        } else {
          console.error(
            "API 응답의 projectsResponse가 배열이 아닙니다:",
            response,
          );
          setData([]);
          setFilteredData([]);
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to fetch project data:", error);
        setData([]);
        setFilteredData([]);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [semesterFilter]);

  // 유형+검색어 필터
  useEffect(() => {
    let next = data;

    if (filter !== "All") {
      next = next.filter(
        (item) => item.projectType?.toLowerCase() === filter.toLowerCase(),
      );
    }

    if (searchTerm.trim() !== "") {
      const q = searchTerm.toLowerCase();
      next = next.filter((item) => item.title?.toLowerCase().includes(q));
    }

    setFilteredData(next);
  }, [filter, data, searchTerm]);

  const toggleYearAccordion = () => setYearAccordionOpen(!yearAccordionOpen);

  const handleSemesterChange = (year, semester) => {
    const nextSemester = toSemester(year, semester);
    setSemesterFilter(nextSemester);
    setSearchParams({ semester: nextSemester });
    setYearAccordionOpen(false);
  };

  if (isLoading) {
    return <LoadingPage />; // 완전 교체
  }

  const isBaseEmpty =
    data.length === 0 && filter === "All" && searchTerm.trim() === "";
  const isFilteredEmpty = !isBaseEmpty && filteredData.length === 0;

  return (
    <div>
      <div className="hero">
        <div className="hero__inner">
          <h1 className="hero__title">
            WAP의
            <br />
            다양한 활동들을 만나보세요
          </h1>
          <p className="hero__subtitle">Discover WAP's diverse activities</p>

          {/* 검색창 */}
          <div className="hero__search">
            <div className="search-bar">
              <span className="search-icon" aria-hidden="true">
                <img
                  src="https://svgsilh.com/svg_v2/1093183.svg"
                  alt=""
                  className="search-icon-img"
                  loading="lazy"
                />
              </span>
              <input
                type="text"
                placeholder="왑의 프로젝트를 검색해보세요!"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="project title search"
                className="search-input"
              />
            </div>
          </div>

          <div className="filter-container">
            {/* 유형: 알약 버튼 그룹 */}
            <div
              className="pill-filter"
              role="tablist"
              aria-label="project type"
            >
              {TYPE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  role="tab"
                  aria-selected={filter === t.value}
                  className={`pill ${filter === t.value ? "active" : ""}`}
                  onClick={() => setFilter(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* 연도 + 학기 필터 드롭다운 */}
            <div className="filter-dropdown">
              <button onClick={toggleYearAccordion} className="dropdown-button">
                {yearAccordionOpen
                  ? "년도/학기 ▲"
                  : `${formatSemesterLabel(semesterFilter)} ▼`}
              </button>
              {yearAccordionOpen && (
                <div className="dropdown-content">
                  {/* 2025년부터 현재년도까지 역순 표시 */}
                  {Array.from(
                    { length: currentYear - 2025 + 1 },
                    (_, i) => currentYear - i,
                  ).map((year) => {
                    const twoDigitYear = ("0" + (year - 2000)).slice(-2); //연도가 두자릿수로 표시되도록
                    return (
                      <div key={year}>
                        <button onClick={() => handleSemesterChange(year, 2)}>
                          {twoDigitYear}-2
                        </button>
                        <button onClick={() => handleSemesterChange(year, 1)}>
                          {twoDigitYear}-1
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="content-box mount1">
        {isBaseEmpty && (
          <div className="empty-state">
            <div className="empty-state__title">
              아직 이번 학기 프로젝트가 등록되지 않았어요
            </div>
            <div className="empty-state__subtitle">
              새로운 프로젝트가 등록되면 이곳에서 확인할 수 있어요.
            </div>
          </div>
        )}

        {isFilteredEmpty && (
          <div className="empty-state">
            <div className="empty-state__title">
              조건에 맞는 프로젝트가 없어요
            </div>
            <div className="empty-state__subtitle">
              필터를 변경하거나 검색어를 지워보세요.
            </div>
          </div>
        )}

        {!isBaseEmpty &&
          !isFilteredEmpty &&
          filteredData.map((item, index) => (
            <div
              key={index}
              className="box"
              onClick={() => navigate(`/project/${item.projectId}`)}
            >
              <div className="image">
                {item.thumbnail && (
                  <img
                    className="project-image"
                    alt={item.title}
                    src={item.thumbnail}
                  />
                )}
              </div>

              <div className="titlebox">
                <div className="title-row">
                  <h2>{item.title}</h2>
                  <span
                    className={`project-type-tag tag--${typeKey(item.projectType)}`}
                  >
                    {getTypeLabel(item.projectType)}
                  </span>
                </div>
                <p>{item.summary}</p>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default ContentBox;
