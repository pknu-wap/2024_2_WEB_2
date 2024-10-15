// 이미지 업로드 컴포넌트
import React, { useRef } from "react";
// useRef : DOM 요소에 접근하기 위한 Hook
import styles from "../../assets/ProjectCreation/ProjectForm.module.css";

const ImageUploader = ({
  imgText,
  imgName,
  errorMessage,
  handleImgUpload,
  type,
}) => {
  // 초기에는 imgName이 null이므로 이미지가 없는 상태
  const fileInputRef = useRef(null);

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleImgUpload(file, type); // 파일과 타입을 함께 전달
      event.target.value = ""; // 파일 입력 초기화 (같은 파일을 다시 선택할 수 있도록)
    }
  };

  return (
    <div className={styles.image_uploader}>
      <label style={{ marginBottom: "15px" }}>{imgText}</label>

      {/* 이미지 업로드 아이콘 */}
      <svg
        id="custom_image_uploader"
        width="31"
        height="31"
        viewBox="0 0 31 31"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        onClick={handleClick} // 클릭 시 파일 입력 트리거 , svg 아이콘을 클릭하면 숨겨져있던 파일 입력 요소가 클릭된 것과 같은 효과
        style={{ cursor: "pointer" }}
      >
        <path
          d="M15.5 0C6.93935 0 0 6.93935 0 15.5C0 24.0606 6.93935 31 15.5 31C24.0606 31 31 24.0606 31 15.5C31 6.93935 24.0606 0 15.5 0ZM21.7 17.05H17.05V21.7C17.05 22.5556 16.3556 23.25 15.5 23.25C14.6444 23.25 13.95 22.5556 13.95 21.7V17.05H9.3C8.4444 17.05 7.75 16.3556 7.75 15.5C7.75 14.6444 8.4444 13.95 9.3 13.95H13.95V9.3C13.95 8.4444 14.6444 7.75 15.5 7.75C16.3556 7.75 17.05 8.4444 17.05 9.3V13.95H21.7C22.5556 13.95 23.25 14.6444 23.25 15.5C23.25 16.3556 22.5556 17.05 21.7 17.05Z"
          fill="#EFEFEF"
        />
      </svg>

      <input
        // input 요소를 참조하기 위한 ref
        ref={fileInputRef}
        className={styles.img_upload_btn}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: "none" }} // 파일 입력 요소 숨기기
      />
      {imgName && imgName instanceof File && (
        <div className="Image-preview">
          <img
            src={URL.createObjectURL(imgName)}
            alt="Image Preview"
            style={{ width: "150px", marginTop: "10px" }}
          />
        </div>
      )}
      {errorMessage.imgName && (
        <p className="error-message">{errorMessage.imgName}</p>
      )}
    </div>
  );
};

export default ImageUploader;
