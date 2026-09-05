ALTER TABLE team_building_meta ADD COLUMN round INT NOT NULL DEFAULT 1;
ALTER TABLE team_building_meta ADD COLUMN completed_round INT NOT NULL DEFAULT 0;
ALTER TABLE team ADD COLUMN round INT NOT NULL DEFAULT 1;
-- Existing teams have already been allocated in round one.
UPDATE team_building_meta m SET completed_round = 1
WHERE EXISTS (SELECT 1 FROM team t WHERE t.semester = m.semester);
