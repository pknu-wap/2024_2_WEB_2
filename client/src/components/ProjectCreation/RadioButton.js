import { React } from "react";
import "../../assets/ProjectCreation/RadioButton.css"; // CSS 파일 경로 추가

const RadioButton = ({ labelname, name, options, selected, setSelected }) => {
  return (
    <div className="radio-button">
      <label className="button-label">{labelname}</label>
      {options.map((option, index) => (
        <label key={index}>
          <div className="radio-option">
            <div className="option-name">{option}</div>
            <div className="option">
              <input
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
