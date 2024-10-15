import React from "react";
import "../../assets/ProjectCreation/InputForm.css"; // CSS 파일 경로 추가

// 매개변수로 받아야 하는 것
// placeholder, maxLen, value, onChange, errorMessage, name
const InputForm = ({
  name,
  placeholder,
  maxLen,
  onChange,
  value,
  errorMessage = {}, // 기본값 설정
}) => {
  return (
    <div className="input-form">
      <div className="input-field">
        <input
          name={name} // 수정: name의 길이가 아닌 name 자체를 전달
          className="input-field"
          type="text"
          placeholder={placeholder}
          maxLength={maxLen}
          value={value}
          onChange={onChange}
        />
        <span className="char-count">
          {value?.length || 0}/{maxLen}
        </span>
      </div>

      {errorMessage?.[name] && ( // 옵셔널 체이닝 사용
        <p className="error-message">{errorMessage[name]}</p>
      )}
    </div>
  );
};

export default InputForm;
