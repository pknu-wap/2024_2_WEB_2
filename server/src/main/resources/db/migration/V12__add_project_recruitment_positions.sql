CREATE TABLE project_recruitment_position (
    project_id BIGINT NOT NULL,
    position_order INT NOT NULL,
    role VARCHAR(50) NOT NULL,
    headcount INT NOT NULL,
    PRIMARY KEY (project_id, position_order),
    CONSTRAINT fk_recruitment_position_project FOREIGN KEY (project_id) REFERENCES project (project_id),
    CONSTRAINT chk_recruitment_headcount CHECK (headcount > 0)
);
