import { useRef, useState } from "react";
import { commentApi } from "../../../api/comment";
import { useNavigate } from "react-router-dom";
import styles from "../../../assets/ProjectDetail/Comments/Comments.module.css";
import userImage from "../../../assets/img/WAP_white_NoBG.png";

// 댓글 : 작성 + 받아오기(컴포넌트)
const Comments = ({ projectId }) => {
  // 입력창 크기 조절을 위한 상태
  const [comments, setComments] = useState("");
  const textAreaRef = useRef(null); // textarea DOM 참조
  const navigate = useNavigate();

  const handleCommentsChange = (e) => {
    setComments(e.target.value);
  };

  // 텍스트가 변경될 때 높이를 조정
  const handleTextAreaChange = (e) => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "auto"; // 높이 초기화
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`; // 내용 크기에 맞게 조정
    }
    handleCommentsChange(e); // 원래 onChange 호출
  };

  const resetForm = () => {
    setComments("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const commentsData = {
      commentContent: comments,
    };

    try {
      await commentApi.addComment(projectId, commentsData);
      alert("댓글이 작성되었습니다.");
      resetForm();
      window.location.reload();
    } catch (error) {
      alert("댓글은 로그인 후에 작성 가능합니다. ");
      navigate("/login");
    }
  };

  //
  return (
    <div>
      <h4 className={styles.comments_title}>댓글</h4>

      <div className={styles.comments}>
        <div className={styles.user_info}>
          <div className={styles.comments_icon}>
            <img className={styles.user_image} alt="user" src={userImage} />
          </div>
        </div>
        <div className={styles.comments_form}>
          <div className={styles.comments_input_form}>
            <textarea
              className={styles.comments_input}
              placeholder="댓글을 입력해주세요."
              onChange={handleTextAreaChange} // 높이 조정 핸들러
              rows={1} // 최소 줄 수
              cols={25}
              spellCheck={false} // 스펠링 체크 끄기
              style={{ overflow: "hidden", resize: "none" }} // 스크롤 숨기고 크기 조정 비활성화
              ref={textAreaRef} // ref 추가
            />
            <button className={styles.comments_button} onClick={handleSubmit}>
              댓글 달기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Comments;
