const FIRST_SEMESTER_END_MONTH = 6;

/**
 * 현재 학기를 "YYYY-0X" 형태로 반환
 * 1~6월: 1학기, 7~12월: 2학기
 * @returns {string} 예: "2025-01", "2025-02"
 */
export const getCurrentSemester = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const semesterNum = currentMonth <= FIRST_SEMESTER_END_MONTH ? 1 : 2;
  return `${currentYear}-${String(semesterNum).padStart(2, "0")}`;
};

/**
 * 특정 날짜의 학기를 반환
 * @param {Date} date - 날짜 객체
 * @returns {string} 예: "2025-01"
 */
export const getSemesterByDate = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const semesterNum = month <= FIRST_SEMESTER_END_MONTH ? 1 : 2;
  return `${year}-${String(semesterNum).padStart(2, "0")}`;
};
