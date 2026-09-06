-- Existing applications and recruitment preferences belong to the first round.
ALTER TABLE project_apply ADD COLUMN round INT NOT NULL DEFAULT 1;
ALTER TABLE project_recruit ADD COLUMN round INT NOT NULL DEFAULT 1;

CREATE INDEX idx_project_apply_project_semester_round
    ON project_apply (project_id, semester, round);
CREATE INDEX idx_project_recruit_project_semester_round
    ON project_recruit (project_id, semester, round);
