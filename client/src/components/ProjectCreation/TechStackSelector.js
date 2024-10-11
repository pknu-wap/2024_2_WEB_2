import React from "react";

// 기술스택 (일단 7가지)
// 근데 결정이 필요함.
const techStackOptions = [
  "React",
  "NodeJS",
  "Python",
  "Java",
  "AWS",
  "MySQL",
  "Spring",
];

// 기술 스택 선택 컴포넌트
const TechStackSelector = () => {
  return (
    <div>
      <label>기술 스택 선택:</label>
      <div>
        {techStackOptions.map((tech) => (
          <label key={tech}>
            <input type="checkbox" value={tech} />
            <img
              src={require(`../../assets/TechStack/${tech}.svg`)}
              alt={tech}
              style={{ width: "40px", height: "40px", marginLeft: "10px" }}
            />
          </label>
        ))}
      </div>
    </div>
  );
};

export default TechStackSelector;
