CREATE TABLE field_cluster_member (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    semester VARCHAR(7) NOT NULL,
    user_id BIGINT NOT NULL,
    position ENUM('FRONTEND','BACKEND','AI','DESIGN','APP','GAME','EMBEDDED') NOT NULL,
    CONSTRAINT uk_field_cluster_semester_user UNIQUE (semester, user_id)
);
