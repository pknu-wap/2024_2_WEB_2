import React from "react";
import { commentApi } from "../../../api/comment";
import userImage from "../../../assets/img/WAP_white_NoBG.png";
import styles from "../../../assets/ProjectDetail/Comments/CommentsList.module.css";

// 코멘트 받아오기
const CommentsList = ({ comments }) => {
  // 댓글 삭제 버튼 핸들러
  const handleDelete = async (commentId) => {
    try {
      await commentApi.deleteComment(commentId);
      alert("댓글이 삭제되었습니다.");
      window.location.reload();
    } catch (error) {
      alert("내가 작성한 댓글이 아닙니다.");
    }
  };
  return (
    <div>
      {comments.map((comment) => (
        <div>
          <div className={styles.comment}>
            <img
              className={styles.comment_image}
              src={userImage}
              alt="profile"
            />
            <div className={styles.comment_info}>
              <div className={styles.user_info}>
                <div className={styles.commenter}>{comment.commenter}</div>
                <div className={styles.commentContent}>
                  {comment.commentContent}
                </div>
              </div>
              <div
                className={styles.close}
                onClick={() => handleDelete(comment.commentId)}
              ></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
export default CommentsList;
