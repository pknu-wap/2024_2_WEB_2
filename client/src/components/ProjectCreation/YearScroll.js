import React, { useEffect, useRef, useState } from "react";
// 스크롤 이벤트를 등록하기 위해 useeffect, useRef, useState 사용
import "./YearScroll.css"; // External CSS file

const YearScroll = () => {
  // 스크롤이벤트 설정을 위한 Hook 사용
  // 선택한 년도 상태 관리
  const [selectedYear, setSelectedYear] = useState(null);

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
        // 사용에 유용한 방식으로 설정하기 위해 53으로 픽스해놓음.
        const itemHeight = 53;
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
  }, []);

  // 날짜 배열 생성
  const years = generateYear();

  return (
    <div>
      <label>년도</label>
      <div className="scroll-container" ref={scrollRef}>
        {years.map((year) => (
          <p
            key={year}
            className={`year-item ${year === selectedYear ? "selected" : ""}`}
          >
            {year}
          </p>
        ))}
      </div>
    </div>
  );
};

export default YearScroll;
