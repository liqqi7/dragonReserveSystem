-- Queries are design examples over the reduced synthetic fixture only.

-- check: wanted_adds_people_across_activities
-- expected: [[10,3,2],[20,2,2]]
SELECT game_id,COUNT(*),COUNT(DISTINCT activity_id)
FROM valid_nominations GROUP BY game_id ORDER BY game_id;

-- check: wanted_mine_counts_activities
-- expected: [[10,2]]
SELECT game_id,COUNT(DISTINCT activity_id) FROM valid_nominations
WHERE user_id=1 GROUP BY game_id ORDER BY game_id;

-- check: wanted_ranks_by_person_times
-- expected: [[10,1],[20,2]]
SELECT game_id,RANK() OVER (ORDER BY COUNT(*) DESC)
FROM valid_nominations GROUP BY game_id ORDER BY game_id;

-- check: wanted_date_is_activity_date
-- expected: [[10,1],[20,1]]
SELECT n.game_id,COUNT(DISTINCT n.user_id) FROM valid_nominations n
JOIN activities a ON a.id=n.activity_id
WHERE a.start_date>='2026-09-01' AND a.start_date<'2026-09-10'
GROUP BY n.game_id ORDER BY n.game_id;

-- check: creator_can_nominate_without_signup
-- expected: [[1]]
SELECT COUNT(*) FROM valid_nominations WHERE activity_id=1 AND user_id=1;

-- check: former_and_guest_members_are_ineligible_while_open
-- expected: [[0]]
SELECT COUNT(*) FROM valid_nominations WHERE user_id IN (5,6);

-- check: public_completed_excludes_held_draft_abandoned_voided
-- expected: [[11]]
SELECT COUNT(*) FROM public_completed;

-- check: most_played_counts_games_not_players_or_expansions
-- expected: [[10,9],[20,1],[30,1]]
SELECT game_id,COUNT(*) FROM public_completed GROUP BY game_id ORDER BY game_id;

-- check: most_played_competition_rank
-- expected: [[10,1],[20,2],[30,2]]
SELECT game_id,RANK() OVER (ORDER BY COUNT(*) DESC)
FROM public_completed GROUP BY game_id ORDER BY game_id;

-- check: mine_uses_participation_in_published_plays
-- expected: [[10,8],[20,1],[30,1]]
SELECT p.game_id,COUNT(*) FROM boardgame_plays p
WHERE p.publication_status='published' AND p.stats_exclusion!='all' AND p.status='completed' AND EXISTS (
  SELECT 1 FROM participant_accounts pp WHERE pp.play_id=p.id AND pp.user_id=1)
GROUP BY p.game_id ORDER BY p.game_id;

-- check: recorder_is_not_automatically_player
-- expected: [[1,0]]
SELECT recorded_by,(SELECT COUNT(*) FROM participant_accounts WHERE play_id=11 AND user_id=1)
FROM boardgame_plays WHERE id=11;

-- check: expansion_usage_includes_standalone_excludes_abandoned
-- expected: [[101,2],[102,2]]
SELECT e.expansion_game_id,COUNT(DISTINCT e.play_id)
FROM boardgame_play_expansions e JOIN public_completed p ON p.id=e.play_id
GROUP BY e.expansion_game_id ORDER BY e.expansion_game_id;

-- check: multi_join_counterexample_is_counted_once
-- expected: [[4,1,2,2]]
SELECT COUNT(*),COUNT(DISTINCT p.id),COUNT(DISTINCT pp.id),COUNT(DISTINCT e.expansion_game_id)
FROM public_completed p
JOIN participant_accounts pp ON pp.play_id=p.id
JOIN boardgame_play_expansions e ON e.play_id=p.id WHERE p.id=1;

-- check: player_participation_counts
-- expected: [[1,10],[2,8],[3,4],[4,1]]
SELECT pp.user_id,COUNT(DISTINCT p.id) FROM public_completed p
JOIN participant_accounts pp ON pp.play_id=p.id
WHERE pp.user_id IS NOT NULL GROUP BY pp.user_id ORDER BY pp.user_id;

-- check: participant_times_include_guest_distinct_users_do_not
-- expected: [[24,4,1]]
SELECT COUNT(*),COUNT(DISTINCT pp.user_id),SUM(pp.user_id IS NULL)
FROM public_completed p JOIN participant_accounts pp ON pp.play_id=p.id;

-- check: duration_missing_is_not_zero
-- expected: [[315,9,2,35.0]]
SELECT SUM(duration_minutes),COUNT(duration_minutes),COUNT(*)-COUNT(duration_minutes),AVG(duration_minutes)
FROM public_completed;

-- check: mine_duration_excludes_recorded_for_others
-- expected: [[280]]
SELECT SUM(p.duration_minutes) FROM boardgame_plays p
WHERE p.publication_status='published' AND p.stats_exclusion!='all' AND p.status='completed' AND EXISTS (
  SELECT 1 FROM participant_accounts pp WHERE pp.play_id=p.id AND pp.user_id=1);

-- check: individual_draw_and_unknown_denominators
-- expected: [[1,5,2,1,2,0.4],[2,6,4,1,1,0.666667],[3,2,0,0,2,0.0]]
SELECT user_id,COUNT(*),SUM(outcome='win'),SUM(outcome='draw'),SUM(outcome='loss'),
       ROUND(1.0*SUM(outcome='win')/COUNT(*),6)
FROM individual_results WHERE game_id=10 GROUP BY user_id ORDER BY user_id;

-- check: minimum_one_eligible_game
-- expected: [[1,5,0.4],[2,6,0.666667],[3,2,0.0]]
SELECT user_id,COUNT(*),ROUND(1.0*SUM(outcome='win')/COUNT(*),6)
FROM individual_results WHERE game_id=10 GROUP BY user_id HAVING COUNT(*)>=1 ORDER BY user_id;

-- check: team_outcomes_without_individual_score_duplication
-- expected: [[1,1,1,0],[2,1,0,0],[3,1,1,0],[4,1,0,0]]
SELECT pp.user_id,COUNT(DISTINCT p.id),SUM(t.outcome='win'),COUNT(pp.score)
FROM public_completed p JOIN participant_accounts pp ON pp.play_id=p.id
JOIN boardgame_play_teams t ON t.play_id=p.id AND t.id=pp.team_id
WHERE p.competition_mode='team' AND p.result_status='resolved'
GROUP BY pp.user_id ORDER BY pp.user_id;

-- check: cooperative_success_excludes_solo
-- expected: [[1,1,1.0]]
SELECT COUNT(*),SUM(cooperative_result='success'),1.0*SUM(cooperative_result='success')/COUNT(*)
FROM public_completed WHERE competition_mode='cooperative'
AND stats_exclusion='none' AND result_status='resolved' AND cooperative_result IN ('success','failure');

-- check: score_comparison_preserves_zero_negative_null_and_variant
-- expected: [[1,2,5.0,10],[2,2,55.0,90],[3,1,-10.0,-10]]
SELECT pp.user_id,COUNT(pp.score),AVG(pp.score),MAX(pp.score)
FROM public_completed p JOIN participant_accounts pp ON pp.play_id=p.id
WHERE p.comparison_key='high-2-none' AND pp.user_id IS NOT NULL
GROUP BY pp.user_id ORDER BY pp.user_id;

-- check: low_score_wins_uses_minimum
-- expected: [[2,-5]]
SELECT pp.user_id,MIN(pp.score)
FROM public_completed p JOIN participant_accounts pp ON pp.play_id=p.id
WHERE p.comparison_key='low-2-none' AND pp.user_id=2 GROUP BY pp.user_id;

-- check: unknown_result_has_no_win_rate
-- expected: [[null]]
SELECT 1.0*SUM(outcome='win')/NULLIF(COUNT(*),0)
FROM individual_results WHERE play_id=2;

-- check: shared_win_has_two_winners_in_one_play
-- expected: [[1,2]]
SELECT COUNT(DISTINCT play_id),SUM(outcome='win') FROM individual_results WHERE play_id=12;

-- check: date_filter_uses_play_date_instead_of_activity_date
-- expected: [[7]]
SELECT COUNT(*) FROM public_completed WHERE played_on>='2026-09-06' AND played_on<'2026-10-01';

-- check: abandoned_is_reported_separately
-- expected: [[1]]
SELECT COUNT(*) FROM boardgame_plays WHERE publication_status='published' AND stats_exclusion!='all' AND status='abandoned';

-- check: wanted_activity_and_quarter_intersect
-- expected: [[10,3,2],[20,2,2]]
SELECT n.game_id,COUNT(*),COUNT(DISTINCT n.activity_id)
FROM valid_nominations n JOIN activities a ON a.id=n.activity_id
WHERE n.activity_id IN (1,2) AND a.start_date>='2026-07-01' AND a.start_date<'2026-10-01'
GROUP BY n.game_id ORDER BY n.game_id;

-- check: wanted_single_activity_counts_its_people
-- expected: [[10,2],[20,1]]
SELECT game_id,COUNT(*) FROM valid_nominations WHERE activity_id=1 GROUP BY game_id ORDER BY game_id;

-- check: published_plays_activity_and_month_intersect
-- expected: [[9]]
SELECT COUNT(*) FROM public_completed WHERE original_activity_id IN (2)
AND played_on>='2026-09-01' AND played_on<'2026-10-01';

-- check: quarter_includes_first_day_excludes_next_quarter
-- expected: [["2026-07-01"],["2026-09-30"]]
WITH dates(value) AS (VALUES('2026-06-30'),('2026-07-01'),('2026-09-30'),('2026-10-01'))
SELECT value FROM dates WHERE value>='2026-07-01' AND value<'2026-10-01' ORDER BY value;

-- check: fourth_quarter_crosses_year_boundary
-- expected: [["2026-10-01"],["2026-12-31"]]
WITH dates(value) AS (VALUES('2026-09-30'),('2026-10-01'),('2026-12-31'),('2027-01-01'))
SELECT value FROM dates WHERE value>='2026-10-01' AND value<'2027-01-01' ORDER BY value;

-- check: year_excludes_adjacent_years
-- expected: [["2026-01-01"],["2026-12-31"]]
WITH dates(value) AS (VALUES('2025-12-31'),('2026-01-01'),('2026-12-31'),('2027-01-01'))
SELECT value FROM dates WHERE value>='2026-01-01' AND value<'2027-01-01' ORDER BY value;

-- check: leap_february_includes_leap_day
-- expected: [["2024-02-29"]]
WITH dates(value) AS (VALUES('2024-01-31'),('2024-02-29'),('2024-03-01'))
SELECT value FROM dates WHERE value>='2024-02-01' AND value<'2024-03-01';

-- check: checked_in_member_can_record_but_unchecked_member_cannot
-- expected: [[1,1],[2,1],[3,0],[4,0],[5,0],[6,0],[7,1]]
SELECT u.id,CASE WHEN u.role='admin' OR (u.role='user' AND
  (a.created_by=u.id OR EXISTS (SELECT 1 FROM activity_participants ap
    WHERE ap.activity_id=a.id AND ap.user_id=u.id AND ap.checked_in_at IS NOT NULL)))
  THEN 1 ELSE 0 END
FROM users u CROSS JOIN activities a WHERE a.id=1 ORDER BY u.id;

-- check: checked_in_recorder_need_not_be_in_proposed_player_list
-- expected: [[1,0]]
SELECT EXISTS(SELECT 1 FROM activity_participants WHERE activity_id=1 AND user_id=2 AND checked_in_at IS NOT NULL),
       2 IN (1,3);

-- check: nominations_editable_until_exact_start
-- expected: [["2026-09-11 17:59:59",1],["2026-09-11 18:00:00",0]]
WITH attempts(at) AS (VALUES('2026-09-11 17:59:59'),('2026-09-11 18:00:00'))
SELECT at,at<(a.start_date || ' 18:00:00') FROM attempts CROSS JOIN activities a WHERE a.id=1 ORDER BY at;

-- check: one_result_is_enough_to_rank
-- expected: [[2,1,1.0],[3,1,0.0]]
SELECT user_id,COUNT(*),1.0*SUM(outcome='win')/COUNT(*)
FROM individual_results WHERE play_id=11 GROUP BY user_id HAVING COUNT(*)>=1 ORDER BY user_id;

-- check: held_imports_stored_but_not_in_public_stats
-- expected: [[2,0]]
SELECT (SELECT COUNT(*) FROM boardgame_plays WHERE origin IN ('bgg','bgstats')),
       (SELECT COUNT(*) FROM public_completed WHERE origin IN ('bgg','bgstats'));

-- check: held_imports_do_not_leak_into_mine
-- expected: [[0]]
SELECT COUNT(*) FROM public_completed p WHERE p.origin IN ('bgg','bgstats')
AND EXISTS(SELECT 1 FROM participant_accounts pp WHERE pp.play_id=p.id AND pp.user_id=1);

-- check: bgg_and_bgstats_sources_can_point_to_one_play
-- expected: [[2,1]]
SELECT COUNT(*),COUNT(DISTINCT play_id) FROM boardgame_play_sources WHERE play_id=15;

-- check: public_reading_does_not_require_participation
-- expected: [[1,0]]
SELECT (SELECT COUNT(*) FROM boardgame_plays WHERE id=4 AND publication_status='published' AND status!='draft'),
       (SELECT COUNT(*) FROM participant_accounts WHERE play_id=4 AND user_id=5);
