-- Apply only after baseline checks, in the same disposable in-memory database.
-- Entirely synthetic; extra fields/entities mirror v3 semantics, not full MySQL DDL.
INSERT INTO users VALUES (88,'user');
INSERT INTO boardgame_people VALUES (8,NULL,'同名朋友'),(9,NULL,'同名朋友');
CREATE TABLE boardgame_locations (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
INSERT INTO boardgame_locations VALUES (21,'同名地点'),(22,'同名地点');
ALTER TABLE boardgame_plays ADD COLUMN location_id INTEGER REFERENCES boardgame_locations(id);
ALTER TABLE boardgame_plays ADD COLUMN play_environment TEXT NOT NULL DEFAULT 'unknown' CHECK(play_environment IN ('online','offline','unknown'));
ALTER TABLE boardgame_plays ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE boardgame_play_players ADD COLUMN role_label TEXT;
ALTER TABLE boardgame_play_players ADD COLUMN is_new_to_player INTEGER;
UPDATE boardgame_plays SET location_id=21,play_environment='online' WHERE id IN (1,2,15);
UPDATE boardgame_plays SET location_id=22,play_environment='offline' WHERE id=4;
UPDATE boardgame_play_players SET is_new_to_player=1 WHERE id=3;
UPDATE boardgame_play_players SET role_label='builder' WHERE id IN (3,27);
UPDATE boardgame_play_players SET role_label='trader' WHERE id=4;
INSERT INTO boardgame_plays (id,game_id,publication_status,status,played_on,competition_mode,result_status,duration_minutes,comparison_key,recorded_by) VALUES
 (17,20,'published','completed','2026-09-11','individual','resolved',20,'20-high-2',1),
 (18,20,'published','completed','2026-09-11','individual','unknown',NULL,'20-high-3',1),
 (19,20,'held','completed','2026-09-12','individual','resolved',999,'20-high-2',1);
INSERT INTO boardgame_play_players(id,play_id,person_id,guest_key,score,outcome) VALUES
 (33,17,8,NULL,0,'win'),(34,17,1,NULL,-1,'loss'),
 (35,18,8,NULL,NULL,NULL),(36,18,NULL,'anon-slot-a',NULL,NULL),(37,18,NULL,'anon-slot-b',NULL,NULL),
 (38,19,8,NULL,999,'win'),(39,19,9,NULL,0,'loss');
CREATE TABLE boardgame_play_scoresheets (
 id INTEGER PRIMARY KEY, play_id INTEGER UNIQUE NOT NULL REFERENCES boardgame_plays(id),
 sheet_comparison_key TEXT, parse_status TEXT NOT NULL,
 projection_version INTEGER NOT NULL, play_revision INTEGER NOT NULL
);
CREATE TABLE boardgame_scoresheet_cells (
 id INTEGER PRIMARY KEY, sheet_id INTEGER NOT NULL REFERENCES boardgame_play_scoresheets(id),
 row_key TEXT NOT NULL, player_id INTEGER NOT NULL REFERENCES boardgame_play_players(id),
 value_number NUMERIC, is_aggregate INTEGER NOT NULL DEFAULT 0,
 projection_version INTEGER NOT NULL,
 UNIQUE(sheet_id,row_key,player_id)
);
INSERT INTO boardgame_play_scoresheets VALUES
 (1,2,'sheetA','parsed',1,1),(2,13,'sheetA','parsed',1,1),
 (3,4,'sheetB','parsed',1,1),(4,11,'sheetA','parsed',1,2),
 (5,15,'sheetA','parsed',1,1),(6,14,NULL,'partial',1,1);
INSERT INTO boardgame_scoresheet_cells VALUES
 (1,1,'cards',3,0,0,1),(2,1,'buildings',3,2,0,1),
 (3,1,'cards',4,-2,0,1),(4,1,'buildings',4,4,0,1),
 (5,2,'cards',27,10,0,1),(6,2,'buildings',27,NULL,0,1),
 (7,2,'cards',28,NULL,0,1),(8,2,'buildings',28,3,0,1),
 (9,1,'total',3,2,1,1),(10,3,'cards',7,1000,0,1),
 (11,4,'cards',23,2000,0,1),(12,5,'cards',31,3000,0,1),
 (13,6,'cards',29,4000,0,1);
CREATE VIEW eligible_sheets AS
 SELECT s.* FROM boardgame_play_scoresheets s JOIN public_completed p ON p.id=s.play_id
 WHERE s.parse_status='parsed' AND s.sheet_comparison_key IS NOT NULL AND s.play_revision=p.revision
 AND NOT EXISTS(SELECT 1 FROM boardgame_scoresheet_cells c WHERE c.sheet_id=s.id AND c.projection_version!=s.projection_version);
CREATE VIEW sheet_a_cells AS
 SELECT c.* FROM boardgame_scoresheet_cells c JOIN eligible_sheets s ON s.id=c.sheet_id
 WHERE s.sheet_comparison_key='sheetA' AND c.is_aggregate=0;
