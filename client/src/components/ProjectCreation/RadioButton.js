import { React } from "react";
import "../../assets/ProjectCreation/RadioButton.css"; // CSS 파일 경로 추가

const RadioButton = ({ labelname, name, options, selected, setSelected }) => {
  return (
    <div className="radio-button">
      <label className="button-label">{labelname}</label>
      {options.map((option, index) => (
        <label key={index}>
          <div className="radio-option">
            <div className="option-name">
              <label
                htmlFor={`${name}-${option}`}
                style={{
                  color: selected === option ? "#FFFFFF" : "#7E7E7E", // 선택된 상태에 따라 색상 변경
                  fontWeight: selected === option ? "bold" : "normal", // 선택된 상태에 따라 글자 굵기 변경
                }}
              >
                {option}
              </label>
            </div>
            <div className="option">
              <input
                id={`${name}-${option}`} // ID 추가
                type="radio"
                name={name}
                value={option}
                checked={selected === option}
                onChange={() => setSelected(option)}
              />
            </div>
          </div>
        </label>
      ))}
    </div>
  );
};

export default RadioButton;
