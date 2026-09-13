-- check: stable_unregistered_identity_and_held_exclusion
-- expected: [[8,2]]
SELECT pp.person_id,COUNT(DISTINCT p.id) FROM public_completed p JOIN boardgame_play_players pp ON pp.play_id=p.id
JOIN boardgame_people pe ON pe.id=pp.person_id WHERE pe.user_id IS NULL GROUP BY pp.person_id ORDER BY pp.person_id;

-- check: names_do_not_merge_people
-- expected: [[2]]
SELECT COUNT(*) FROM boardgame_people WHERE display_name='同名朋友';

-- check: published_counts_do_not_multiply_players_expansions
-- expected: [[13,10]]
SELECT COUNT(*),COUNT(DISTINCT played_on) FROM public_completed;

-- check: full_set_h_index
-- expected: [[2]]
WITH counts AS (SELECT game_id,COUNT(*) n FROM public_completed GROUP BY game_id), ordered AS
(SELECT n,ROW_NUMBER() OVER(ORDER BY n DESC,game_id) r FROM counts)
SELECT COALESCE(MAX(r),0) FROM ordered WHERE n>=r;

-- check: empty_h_index
-- expected: [[0]]
WITH counts AS (SELECT game_id,COUNT(*) n FROM public_completed WHERE game_id=999 GROUP BY game_id), ordered AS
(SELECT n,ROW_NUMBER() OVER(ORDER BY n DESC,game_id) r FROM counts)
SELECT COALESCE(MAX(r),0) FROM ordered WHERE n>=r;

-- check: overlapping_milestones
-- expected: [[5,1],[10,0],[25,0],[100,0]]
WITH thresholds(t) AS (VALUES(5),(10),(25),(100)), counts AS(SELECT game_id,COUNT(*) n FROM public_completed GROUP BY game_id)
SELECT t,(SELECT COUNT(*) FROM counts WHERE n>=t) FROM thresholds;

-- check: online_unknown_not_offline
-- expected: [["offline",1],["online",2],["unknown",10]]
SELECT play_environment,COUNT(*) FROM public_completed GROUP BY play_environment ORDER BY play_environment;

-- check: location_null_bucket_and_distinct_ids
-- expected: [[null,10],[21,2],[22,1]]
SELECT location_id,COUNT(*) FROM public_completed GROUP BY location_id ORDER BY location_id;

-- check: person_all_keeps_extra_anonymous_but_exactly_excludes
-- expected: [[17],[18]]
SELECT p.id FROM public_completed p WHERE EXISTS(SELECT 1 FROM boardgame_play_players pp WHERE pp.play_id=p.id AND pp.person_id=8) ORDER BY p.id;

-- check: person_exactly_rejects_anonymous_extra_slots
-- expected: [[17]]
SELECT p.id FROM public_completed p WHERE
 (SELECT COUNT(*) FROM boardgame_play_players pp WHERE pp.play_id=p.id AND pp.person_id IN (1,8))=2
 AND NOT EXISTS(SELECT 1 FROM boardgame_play_players pp WHERE pp.play_id=p.id AND (pp.person_id IS NULL OR pp.person_id NOT IN (1,8))) ORDER BY p.id;

-- check: person_any
-- expected: [[17],[18]]
SELECT p.id FROM public_completed p WHERE EXISTS(SELECT 1 FROM boardgame_play_players pp WHERE pp.play_id=p.id AND pp.person_id IN (8,9)) ORDER BY p.id;

-- check: expansion_exactly_and_real_player_count
-- expected: [[1,2]]
SELECT p.id,(SELECT COUNT(*) FROM boardgame_play_players pp WHERE pp.play_id=p.id) FROM public_completed p
WHERE (SELECT COUNT(*) FROM boardgame_play_expansions e WHERE e.play_id=p.id AND e.expansion_game_id IN (101,102))=2
AND NOT EXISTS(SELECT 1 FROM boardgame_play_expansions e WHERE e.play_id=p.id AND e.expansion_game_id NOT IN (101,102));

-- check: partners_exclude_subject_and_anonymous
-- expected: [[1,1]]
SELECT pp.person_id,COUNT(DISTINCT p.id) FROM public_completed p JOIN boardgame_play_players pp ON pp.play_id=p.id
WHERE pp.person_id IS NOT NULL AND pp.person_id!=8 AND EXISTS(SELECT 1 FROM boardgame_play_players me WHERE me.play_id=p.id AND me.person_id=8)
GROUP BY pp.person_id ORDER BY pp.person_id;

-- check: missing_duration_not_zero
-- expected: [[10,3,335,33.5]]
SELECT COUNT(duration_minutes),SUM(duration_minutes IS NULL),SUM(duration_minutes),AVG(duration_minutes) FROM public_completed;

-- check: explicit_new_is_not_first_recorded
-- expected: [["2026-09-01","2026-09-02"]]
SELECT MIN(p.played_on),MIN(CASE WHEN pp.is_new_to_player=1 THEN p.played_on END) FROM public_completed p JOIN boardgame_play_players pp ON pp.play_id=p.id WHERE pp.person_id=1 AND p.game_id=10;

-- check: first_recorded_does_not_reset_with_period
-- expected: [["2026-09-01"]]
SELECT MIN(p.played_on) FROM public_completed p JOIN boardgame_play_players pp ON pp.play_id=p.id WHERE pp.person_id=1 AND p.game_id=10
AND EXISTS(SELECT 1 FROM public_completed recent JOIN boardgame_play_players pp2 ON pp2.play_id=recent.id WHERE pp2.person_id=1 AND recent.game_id=10 AND recent.played_on>='2026-09-09');

-- check: role_samples_and_distinct_plays
-- expected: [[null,1,1],["builder",2,2],["trader",1,1]]
SELECT pp.role_label,COUNT(*),COUNT(DISTINCT p.id) FROM public_completed p JOIN boardgame_play_players pp ON pp.play_id=p.id
WHERE p.id IN (2,13) GROUP BY pp.role_label ORDER BY pp.role_label;

-- check: team_all_counts_teams_not_team_members
-- expected: [[2,1,1]]
SELECT COUNT(*),SUM(t.outcome='win'),SUM(t.outcome='loss') FROM public_completed p JOIN boardgame_play_teams t ON t.play_id=p.id
WHERE p.competition_mode='team' AND p.result_status='resolved' AND p.stats_exclusion='none';

-- check: team_subject_uses_own_team
-- expected: [[1,1]]
SELECT COUNT(*),SUM(t.outcome='win') FROM public_completed p JOIN boardgame_play_teams t ON t.play_id=p.id
WHERE p.competition_mode='team' AND p.result_status='resolved' AND p.stats_exclusion='none'
AND EXISTS(SELECT 1 FROM boardgame_play_players pp WHERE pp.play_id=p.id AND pp.team_id=t.id AND pp.person_id=1);

-- check: coop_solo_separate_denominators
-- expected: [["cooperative",1,1],["solo",1,1]]
SELECT competition_mode,COUNT(*),SUM(cooperative_result='success') FROM public_completed
WHERE competition_mode IN ('cooperative','solo') AND result_status='resolved' AND stats_exclusion='none' GROUP BY competition_mode ORDER BY competition_mode;

-- check: sheet_same_rules_only_and_stale_held_partial_excluded
-- expected: [[1],[2]]
SELECT id FROM eligible_sheets WHERE sheet_comparison_key='sheetA' ORDER BY id;

-- check: sheet_rows_zero_negative_missing_no_subtotals
-- expected: [["buildings",4,3,1,3.0,2,4],["cards",4,3,1,2.666667,-2,10]]
SELECT row_key,COUNT(*),COUNT(value_number),SUM(value_number IS NULL),ROUND(AVG(value_number),6),MIN(value_number),MAX(value_number)
FROM sheet_a_cells GROUP BY row_key ORDER BY row_key;

-- check: sheet_person_filter_not_all_participants_in_matching_plays
-- expected: [["buildings",2,1,2.0],["cards",2,2,5.0]]
SELECT c.row_key,COUNT(*),COUNT(c.value_number),AVG(c.value_number) FROM sheet_a_cells c
JOIN boardgame_play_players pp ON pp.id=c.player_id WHERE pp.person_id=1 GROUP BY c.row_key ORDER BY c.row_key;

-- check: contribution_uses_same_complete_subjects_and_all_additive_rows
-- expected: [["buildings",2,1.5],["cards",2,-0.5]]
WITH complete AS(SELECT sheet_id,player_id FROM sheet_a_cells WHERE row_key IN ('cards','buildings') GROUP BY sheet_id,player_id HAVING COUNT(value_number)=2), vals AS
(SELECT c.* FROM sheet_a_cells c JOIN complete ok ON ok.sheet_id=c.sheet_id AND ok.player_id=c.player_id)
SELECT row_key,COUNT(*),1.0*SUM(value_number)/(SELECT SUM(value_number) FROM vals) FROM vals GROUP BY row_key ORDER BY row_key;

-- check: zero_contribution_denominator_is_unknown
-- expected: [[null]]
SELECT 1.0*SUM(v)/NULLIF(SUM(v),0) FROM (SELECT 2 v UNION ALL SELECT -2);

-- check: numeric_drilldown_returns_plays_not_cell_samples
-- expected: [[2],[13]]
SELECT DISTINCT s.play_id FROM sheet_a_cells c JOIN eligible_sheets s ON s.id=c.sheet_id
WHERE c.row_key='cards' AND c.value_number IS NOT NULL ORDER BY s.play_id;
