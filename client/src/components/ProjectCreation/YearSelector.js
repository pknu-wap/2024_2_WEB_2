import React, { useEffect, useRef } from "react";
// 스크롤 이벤트를 등록하기 위해 useEffect, useRef 사용
import "../../assets/ProjectCreation/YearSelector.css"; // External CSS file

const YearSelector = ({ selectedYear, setSelectedYear }) => {
  // 스크롤 컨테이너 참조
  const scrollRef = useRef(null);

  // 현재 년도까지의 년도를 배열로 생성
  const generateYear = () => {
    const today = new Date();
    const startYear = 2000;
    const endYear = today.getFullYear();
    const years = [];

    for (let year = startYear; year <= endYear; year++) {
      years.push(year);
    }

    return years;
  };

  // 스크롤 이벤트
  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        const scrollPosition = scrollRef.current.scrollTop;
        // 각 아이템의 높이 지정
        const itemHeight = 26;
        // 스크롤 위치에 따른 인덱스 계산
        let index = Math.round(scrollPosition / itemHeight);
        // 날짜 배열 생성
        const years = generateYear();

        // 인덱스를 배열 범위 내로 제한
        index = Math.max(0, Math.min(index, years.length - 1));

        const selected = years[index];
        setSelectedYear(selected);
      }
    };

    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (scrollElement) {
        scrollElement.removeEventListener("scroll", handleScroll);
      }
    };
  }, [setSelectedYear]);

  // 날짜 배열 생성
  const years = generateYear();

  // 클릭 핸들러
  const handleYearClick = (year) => {
    setSelectedYear(year); // 클릭한 년도로 선택 변경
    if (scrollRef.current) {
      // 클릭 시 스크롤을 해당 년도로 이동 (선택된 년도 위치)
      const index = years.indexOf(year);
      const itemHeight = 26; // 각 아이템의 높이
      scrollRef.current.scrollTop = index * itemHeight; // 스크롤 위치 설정
    }
  };

  return (
    <div className="year-selector">
      <div className="year-label">
        <label>년도</label>
      </div>
      <div className="scroll-container" ref={scrollRef}>
        {years.map((year) => (
          <p
            key={year}
            className={`year-item ${year === selectedYear ? "selected" : ""}`}
            onClick={() => handleYearClick(year)} // 클릭 이벤트 추가
          >
            {year}
          </p>
        ))}
      </div>
    </div>
  );
};

export default YearSelector;
