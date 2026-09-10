CREATE TABLE third_round_plan (
    semester VARCHAR(7) NOT NULL PRIMARY KEY,
    revision BIGINT NOT NULL DEFAULT 0,
    next_team_number BIGINT NOT NULL DEFAULT 1
);

CREATE TABLE third_round_plan_team (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    semester VARCHAR(7) NOT NULL,
    project_id BIGINT NULL,
    name VARCHAR(255) NOT NULL,
    CONSTRAINT uk_third_plan_project UNIQUE (semester, project_id),
    CONSTRAINT uk_third_plan_team_semester UNIQUE (semester, id),
    CONSTRAINT fk_third_team_plan FOREIGN KEY (semester) REFERENCES third_round_plan(semester)
);

CREATE TABLE third_round_position_slot (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    semester VARCHAR(7) NOT NULL,
    position ENUM('FRONTEND','BACKEND','AI','DESIGN','APP','GAME','EMBEDDED') NOT NULL,
    team_id BIGINT NULL,
    CONSTRAINT fk_third_slot_plan FOREIGN KEY (semester) REFERENCES third_round_plan(semester),
    CONSTRAINT fk_third_slot_team FOREIGN KEY (semester, team_id)
        REFERENCES third_round_plan_team(semester, id)
);
