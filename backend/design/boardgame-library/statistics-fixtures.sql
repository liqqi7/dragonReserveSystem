-- Design-only, synthetic data. Never use this reduced schema as a migration.
PRAGMA foreign_keys = ON;

CREATE TABLE users (id INTEGER PRIMARY KEY, role TEXT NOT NULL);
CREATE TABLE activities (
    id INTEGER PRIMARY KEY, status TEXT NOT NULL, start_date TEXT NOT NULL,
    created_by INTEGER NOT NULL REFERENCES users(id)
);
CREATE TABLE activity_participants (
    activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id), checked_in_at TEXT,
    PRIMARY KEY (activity_id, user_id)
);
CREATE TABLE activity_game_nominations (
    id INTEGER PRIMARY KEY,
    activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    game_id INTEGER NOT NULL, user_id INTEGER NOT NULL REFERENCES users(id),
    state TEXT NOT NULL,
    UNIQUE (activity_id, game_id, user_id)
);
CREATE TABLE boardgame_plays (
    id INTEGER PRIMARY KEY, game_id INTEGER NOT NULL,
    activity_id INTEGER REFERENCES activities(id) ON DELETE SET NULL,
    publication_status TEXT NOT NULL, status TEXT NOT NULL, played_on TEXT,
    competition_mode TEXT NOT NULL, result_status TEXT NOT NULL,
    duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes >= 1),
    comparison_key TEXT, cooperative_result TEXT,
    recorded_by INTEGER NOT NULL REFERENCES users(id),
    activity_snapshot TEXT
);
CREATE TABLE boardgame_play_teams (
    id INTEGER PRIMARY KEY,
    play_id INTEGER NOT NULL REFERENCES boardgame_plays(id),
    score NUMERIC, rank INTEGER, outcome TEXT,
    UNIQUE (play_id, id)
);
CREATE TABLE boardgame_people (id INTEGER PRIMARY KEY, user_id INTEGER UNIQUE REFERENCES users(id), display_name TEXT NOT NULL);
CREATE TABLE boardgame_play_players (
    id INTEGER PRIMARY KEY,
    play_id INTEGER NOT NULL REFERENCES boardgame_plays(id),
    person_id INTEGER REFERENCES boardgame_people(id), guest_key TEXT,
    team_id INTEGER, score NUMERIC, rank INTEGER, outcome TEXT,
    CHECK ((person_id IS NULL) != (guest_key IS NULL)),
    UNIQUE (play_id, person_id), UNIQUE (play_id, guest_key),
    FOREIGN KEY (play_id, team_id) REFERENCES boardgame_play_teams(play_id, id)
);
CREATE TABLE boardgame_play_expansions (
    play_id INTEGER NOT NULL REFERENCES boardgame_plays(id),
    expansion_game_id INTEGER NOT NULL,
    PRIMARY KEY (play_id, expansion_game_id)
);

INSERT INTO users VALUES (1,'user'),(2,'user'),(3,'user'),(4,'user'),(5,'user'),(6,'guest'),(7,'admin');
INSERT INTO boardgame_people SELECT id,id,'synthetic-person-'||id FROM users;
INSERT INTO activities VALUES
    (1,'未开始','2026-09-11',1), (2,'已结束','2026-09-05',1),
    (3,'已取消','2026-09-04',1), (4,'已流局','2026-09-03',1),
    (5,'已删除','2026-09-02',1);
INSERT INTO activity_participants VALUES (1,2,'2026-09-11 17:45:00'),(1,3,NULL),(1,6,'2026-09-11 17:45:00');
INSERT INTO activity_game_nominations VALUES
    (1,1,10,1,'active'), (2,1,10,2,'active'), (3,2,10,1,'frozen'),
    (4,1,20,3,'active'), (5,2,20,2,'frozen'), (6,3,10,3,'active'),
    (7,1,10,4,'withdrawn'), (8,4,30,4,'active'), (9,5,30,5,'frozen'),
    (10,1,20,1,'ineligible'), (11,1,20,4,'removed'),
    (12,1,30,5,'active'), (13,1,30,6,'active');

-- Actor 1 deliberately records play 11 without participating.
-- Comparison keys are readable fixture labels, not production SHA-256 values.
INSERT INTO boardgame_plays VALUES
    (1,10,2,'published','completed','2026-09-01','individual','resolved',60,'high-2-ab',NULL,1,'{"name":"历史活动","created_by":1}'),
    (2,10,2,'published','completed','2026-09-02','individual','unknown',NULL,'high-2-none',NULL,1,'{"name":"历史活动","created_by":1}'),
    (3,20,2,'published','completed','2026-09-03','cooperative','resolved',30,'coop-2','success',1,'{"name":"历史活动","created_by":1}'),
    (4,10,NULL,'published','completed','2026-09-04','individual','resolved',20,'high-2-none',NULL,1,NULL),
    (5,10,2,'published','abandoned','2026-09-05','individual','unknown',15,'high-2-none',NULL,1,'{"name":"历史活动","created_by":1}'),
    (6,10,2,'published','draft','2026-09-05','individual','unknown',NULL,'high-2-none',NULL,1,'{"name":"历史活动","created_by":1}'),
    (7,10,2,'published','voided','2026-09-05','individual','resolved',40,'high-2-none',NULL,1,'{"name":"历史活动","created_by":1}'),
    (8,10,2,'published','completed','2026-09-06','individual','resolved',45,'high-3-none',NULL,1,'{"name":"历史活动","created_by":1}'),
    (9,10,2,'published','completed','2026-09-07','team','resolved',50,'team-2v2',NULL,1,'{"name":"历史活动","created_by":1}'),
    (10,30,NULL,'published','completed','2026-09-08','solo','resolved',10,'solo-1','success',1,NULL),
    (11,10,2,'published','completed','2026-09-09','individual','resolved',35,'high-2-none',NULL,1,'{"name":"历史活动","created_by":1}'),
    (12,10,2,'published','completed','2026-09-10','individual','resolved',25,'high-2-a',NULL,1,'{"name":"历史活动","created_by":1}'),
    (13,10,2,'published','completed','2026-09-10','individual','unknown',NULL,'high-2-none',NULL,1,'{"name":"历史活动","created_by":1}'),
    (14,10,2,'published','completed','2026-09-10','individual','resolved',40,'low-2-none',NULL,1,'{"name":"历史活动","created_by":1}');
INSERT INTO boardgame_play_teams VALUES (901,9,20,1,'win'),(902,9,15,2,'loss');
INSERT INTO boardgame_play_players VALUES
    (1,1,1,NULL,NULL,100,1,'win'), (2,1,2,NULL,NULL,80,2,'loss'),
    (3,2,1,NULL,NULL,NULL,NULL,NULL), (4,2,2,NULL,NULL,NULL,NULL,NULL),
    (5,3,1,NULL,NULL,NULL,NULL,NULL), (6,3,3,NULL,NULL,NULL,NULL,NULL),
    (7,4,1,NULL,NULL,10,2,'loss'), (8,4,2,NULL,NULL,20,1,'win'),
    (9,5,1,NULL,NULL,NULL,NULL,NULL), (10,5,2,NULL,NULL,NULL,NULL,NULL),
    (11,6,1,NULL,NULL,NULL,NULL,NULL), (12,6,2,NULL,NULL,NULL,NULL,NULL),
    (13,7,1,NULL,NULL,20,1,'win'), (14,7,2,NULL,NULL,10,2,'loss'),
    (15,8,1,NULL,NULL,50,1,'draw'), (16,8,2,NULL,NULL,50,1,'draw'),
    (17,8,3,NULL,NULL,30,3,'loss'),
    (18,9,1,NULL,901,NULL,NULL,NULL), (19,9,3,NULL,901,NULL,NULL,NULL),
    (20,9,2,NULL,902,NULL,NULL,NULL), (21,9,4,NULL,902,NULL,NULL,NULL),
    (22,10,1,NULL,NULL,NULL,NULL,NULL),
    (23,11,2,NULL,NULL,90,1,'win'), (24,11,3,NULL,NULL,-10,2,'loss'),
    (25,12,1,NULL,NULL,100,1,'win'), (26,12,2,NULL,NULL,100,1,'win'),
    (27,13,1,NULL,NULL,0,NULL,NULL), (28,13,NULL,'visitor-1',NULL,NULL,NULL,NULL),
    (29,14,1,NULL,NULL,20,2,'loss'), (30,14,2,NULL,NULL,-5,1,'win');
INSERT INTO boardgame_play_expansions VALUES (1,101),(1,102),(12,101),(5,101),(4,102);

-- Additional v2 source/publication fixtures are deliberately held.
INSERT INTO boardgame_plays VALUES
    (15,10,NULL,'held','completed','2026-07-01','individual','resolved',50,'high-2-none',NULL,1,NULL),
    (16,20,NULL,'held','draft',NULL,'unscored','unknown',NULL,NULL,NULL,1,NULL);
INSERT INTO boardgame_play_players VALUES
    (31,15,1,NULL,NULL,999,1,'win'),(32,15,2,NULL,NULL,1,2,'loss');
ALTER TABLE boardgame_plays ADD COLUMN origin TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE boardgame_plays ADD COLUMN stats_exclusion TEXT NOT NULL DEFAULT 'none';
ALTER TABLE boardgame_plays ADD COLUMN original_activity_id INTEGER;
UPDATE boardgame_plays SET original_activity_id=activity_id;
UPDATE boardgame_plays SET origin='bgg' WHERE id=15;
UPDATE boardgame_plays SET origin='bgstats' WHERE id=16;
CREATE TABLE boardgame_play_sources (
    id INTEGER PRIMARY KEY, play_id INTEGER NOT NULL REFERENCES boardgame_plays(id),
    provider TEXT NOT NULL, source_namespace TEXT NOT NULL,
    source_play_id TEXT NOT NULL, segment_index INTEGER NOT NULL CHECK(segment_index>=1),
    UNIQUE(provider,source_namespace,source_play_id,segment_index)
);
INSERT INTO boardgame_play_sources VALUES
    (1,15,'bgg','sample-account','bgg-100',1),
    (2,15,'bgstats','uuid','same-play-uuid',1),
    (3,16,'bgstats','uuid','incomplete-play-uuid',1);

CREATE VIEW valid_nominations AS
SELECT n.* FROM activity_game_nominations n
JOIN activities a ON a.id=n.activity_id
JOIN users u ON u.id=n.user_id
WHERE a.status NOT IN ('已取消','已流局','已删除')
  AND (n.state='frozen' OR
       (n.state='active' AND u.role IN ('user','admin') AND
        (a.created_by=n.user_id OR EXISTS (
            SELECT 1 FROM activity_participants ap
            WHERE ap.activity_id=n.activity_id AND ap.user_id=n.user_id))));

CREATE VIEW public_completed AS
SELECT * FROM boardgame_plays WHERE publication_status='published' AND status='completed' AND stats_exclusion!='all';

CREATE VIEW participant_accounts AS SELECT pp.*, pe.user_id FROM boardgame_play_players pp LEFT JOIN boardgame_people pe ON pe.id=pp.person_id;

CREATE VIEW individual_results AS
SELECT p.id AS play_id, p.game_id, pp.user_id, pp.outcome
FROM public_completed p JOIN participant_accounts pp ON pp.play_id=p.id
WHERE p.competition_mode='individual' AND p.result_status='resolved' AND p.stats_exclusion='none'
  AND pp.user_id IS NOT NULL AND pp.outcome IN ('win','loss','draw');
