# v3.3 完整字段快照

从当前 ORM 离线生成，包含 34 张领域表。业务语义见 [数据模型](02-data-model.md)；索引、外键与 CHECK 见 [完整 DDL](database-schema.sql)。

审计时间、用户、JSON 对象等无服务器默认值的字段由服务赋值；“—”不代表可省略。

## boardgame_audit_events

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | 是 | — |
| `entity_type` | VARCHAR(32) | 否 | — | — |
| `entity_id` | VARCHAR(64) COLLATE utf8mb4_bin | 否 | — | — |
| `entity_revision` | INTEGER | 否 | — | — |
| `action` | VARCHAR(32) | 否 | — | — |
| `actor_user_id` | INTEGER | 是 | — | — |
| `before_data` | JSON | 是 | — | — |
| `after_data` | JSON | 是 | — | — |
| `reason` | VARCHAR(1000) | 是 | — | — |
| `request_id` | VARCHAR(64) | 是 | — | — |
| `created_at` | DATETIME(6) | 否 | — | — |

## boardgame_import_jobs

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `id` | VARCHAR(36) COLLATE utf8mb4_bin | 否 | 是 | — |
| `kind` | VARCHAR(32) | 否 | — | — |
| `requested_by` | INTEGER | 否 | — | — |
| `params` | JSON | 否 | — | — |
| `state` | VARCHAR(32) | 否 | — | 'queued' |
| `progress` | JSON | 否 | — | — |
| `error_code` | VARCHAR(255) | 是 | — | — |
| `error_message` | VARCHAR(255) | 是 | — | — |
| `attempt_count` | INTEGER | 否 | — | 0 |
| `next_attempt_at` | DATETIME(6) | 是 | — | — |
| `lease_owner` | VARCHAR(64) | 是 | — | — |
| `lease_expires_at` | DATETIME(6) | 是 | — | — |
| `created_at` | DATETIME(6) | 否 | — | — |
| `updated_at` | DATETIME(6) | 否 | — | — |
| `revision` | INTEGER | 否 | — | 1 |

## boardgame_locations

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | 是 | — |
| `name` | VARCHAR(255) | 否 | — | — |
| `is_visible` | BOOL | 否 | — | false |
| `archived_at` | DATETIME(6) | 是 | — | — |
| `created_by` | INTEGER | 否 | — | — |
| `updated_by` | INTEGER | 否 | — | — |
| `created_at` | DATETIME(6) | 否 | — | — |
| `updated_at` | DATETIME(6) | 否 | — | — |
| `revision` | INTEGER | 否 | — | 1 |

## boardgame_people

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | 是 | — |
| `user_id` | INTEGER | 是 | — | — |
| `display_name` | VARCHAR(64) | 否 | — | — |
| `is_visible` | BOOL | 否 | — | false |
| `archived_at` | DATETIME(6) | 是 | — | — |
| `merged_into_id` | INTEGER | 是 | — | — |
| `created_by` | INTEGER | 否 | — | — |
| `updated_by` | INTEGER | 否 | — | — |
| `created_at` | DATETIME(6) | 否 | — | — |
| `updated_at` | DATETIME(6) | 否 | — | — |
| `revision` | INTEGER | 否 | — | 1 |

## boardgame_request_keys

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | 是 | — |
| `actor_user_id` | INTEGER | 否 | — | — |
| `operation` | VARCHAR(64) COLLATE utf8mb4_bin | 否 | — | — |
| `key` | VARCHAR(36) COLLATE utf8mb4_bin | 否 | — | — |
| `request_hash` | VARCHAR(64) COLLATE utf8mb4_bin | 否 | — | — |
| `resource_type` | VARCHAR(32) | 否 | — | — |
| `resource_ids` | JSON | 否 | — | — |
| `created_at` | DATETIME(6) | 否 | — | — |

## boardgame_saved_filters

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | 是 | — |
| `user_id` | INTEGER | 否 | — | — |
| `name` | VARCHAR(64) | 否 | — | — |
| `target` | VARCHAR(16) | 否 | — | — |
| `query` | JSON | 否 | — | — |
| `created_by` | INTEGER | 否 | — | — |
| `updated_by` | INTEGER | 否 | — | — |
| `created_at` | DATETIME(6) | 否 | — | — |
| `updated_at` | DATETIME(6) | 否 | — | — |
| `revision` | INTEGER | 否 | — | 1 |

## boardgame_sync_operations

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | 是 | — |
| `user_id` | INTEGER | 否 | — | — |
| `client_id` | VARCHAR(36) | 否 | — | — |
| `operation_id` | VARCHAR(36) | 否 | — | — |
| `request_hash` | VARCHAR(64) | 否 | — | — |
| `response` | JSON | 否 | — | — |
| `created_at` | DATETIME(6) | 否 | — | — |

## boardgame_tags

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | 是 | — |
| `user_id` | INTEGER | 否 | — | — |
| `name` | VARCHAR(64) | 否 | — | — |
| `is_active` | BOOL | 否 | — | true |
| `created_by` | INTEGER | 否 | — | — |
| `updated_by` | INTEGER | 否 | — | — |
| `created_at` | DATETIME(6) | 否 | — | — |
| `updated_at` | DATETIME(6) | 否 | — | — |
| `revision` | INTEGER | 否 | — | 1 |

## boardgames

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | 是 | — |
| `bgg_id` | INTEGER | 是 | — | — |
| `name` | VARCHAR(255) | 否 | — | — |
| `aliases` | JSON | 否 | — | — |
| `game_type` | VARCHAR(16) | 否 | — | — |
| `is_standalone` | BOOL | 否 | — | false |
| `cover_url` | VARCHAR(1024) | 是 | — | — |
| `description` | TEXT | 是 | — | — |
| `min_players` | INTEGER | 是 | — | — |
| `max_players` | INTEGER | 是 | — | — |
| `min_playtime_minutes` | INTEGER | 是 | — | — |
| `max_playtime_minutes` | INTEGER | 是 | — | — |
| `min_age` | INTEGER | 是 | — | — |
| `year_published` | INTEGER | 是 | — | — |
| `local_overrides` | JSON | 否 | — | — |
| `search_text` | TEXT | 否 | — | — |
| `default_rules` | JSON | 否 | — | — |
| `is_visible` | BOOL | 否 | — | true |
| `sort_order` | INTEGER | 否 | — | 0 |
| `archived_at` | DATETIME(6) | 是 | — | — |
| `merged_into_id` | INTEGER | 是 | — | — |
| `bgg_payload` | JSON | 是 | — | — |
| `bgg_raw_xml` | LONGTEXT | 是 | — | — |
| `bgg_request_params` | JSON | 是 | — | — |
| `bgg_synced_at` | DATETIME(6) | 是 | — | — |
| `bgg_parser_version` | VARCHAR(32) | 是 | — | — |
| `bgg_content_hash` | VARCHAR(64) COLLATE utf8mb4_bin | 是 | — | — |
| `projection_warnings` | JSON | 否 | — | — |
| `created_by` | INTEGER | 否 | — | — |
| `updated_by` | INTEGER | 否 | — | — |
| `created_at` | DATETIME(6) | 否 | — | — |
| `updated_at` | DATETIME(6) | 否 | — | — |
| `revision` | INTEGER | 否 | — | 1 |
| `complexity` | NUMERIC(4, 2) | 是 | — | — |

## activity_game_nominations

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | 是 | — |
| `activity_id` | INTEGER | 否 | — | — |
| `game_id` | INTEGER | 否 | — | — |
| `user_id` | INTEGER | 否 | — | — |
| `state` | VARCHAR(16) | 否 | — | 'active' |
| `frozen_at` | DATETIME(6) | 是 | — | — |
| `note` | VARCHAR(500) | 是 | — | — |
| `created_by` | INTEGER | 否 | — | — |
| `updated_by` | INTEGER | 否 | — | — |
| `created_at` | DATETIME(6) | 否 | — | — |
| `updated_at` | DATETIME(6) | 否 | — | — |
| `revision` | INTEGER | 否 | — | 1 |

## activity_game_settings

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `activity_id` | INTEGER | 否 | 是 | — |
| `frozen_at` | DATETIME(6) | 是 | — | — |
| `cutoff_snapshot` | DATETIME(6) | 是 | — | — |
| `revision` | INTEGER | 否 | — | 1 |

## boardgame_expansion_links

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `base_game_id` | INTEGER | 否 | 是 | — |
| `expansion_game_id` | INTEGER | 否 | 是 | — |
| `bgg_suggested` | BOOL | 否 | — | false |
| `manual_decision` | VARCHAR(16) | 否 | — | 'inherit' |
| `note` | VARCHAR(500) | 是 | — | — |
| `updated_by` | INTEGER | 否 | — | — |
| `updated_at` | DATETIME(6) | 否 | — | — |
| `revision` | INTEGER | 否 | — | 1 |

## boardgame_game_tags

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `game_id` | INTEGER | 否 | 是 | — |
| `tag_id` | INTEGER | 否 | 是 | — |

## boardgame_import_mappings

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | 是 | — |
| `provider` | VARCHAR(16) | 否 | — | — |
| `source_namespace` | VARCHAR(128) COLLATE utf8mb4_bin | 否 | — | — |
| `entity_type` | VARCHAR(16) | 否 | — | — |
| `external_id` | VARCHAR(128) COLLATE utf8mb4_bin | 否 | — | — |
| `target_game_id` | INTEGER | 是 | — | — |
| `target_person_id` | INTEGER | 是 | — | — |
| `target_location_id` | INTEGER | 是 | — | — |
| `confirmed_by` | INTEGER | 否 | — | — |
| `created_at` | DATETIME(6) | 否 | — | — |
| `updated_at` | DATETIME(6) | 否 | — | — |
| `revision` | INTEGER | 否 | — | 1 |

## boardgame_inventory

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | 是 | — |
| `game_id` | INTEGER | 否 | — | — |
| `owner_type` | VARCHAR(16) | 否 | — | — |
| `owner_user_id` | INTEGER | 是 | — | — |
| `owner_label` | VARCHAR(64) | 是 | — | — |
| `status` | VARCHAR(16) | 否 | — | 'unverified' |
| `available_for_activity` | BOOL | 否 | — | false |
| `purchased_on` | DATE | 是 | — | — |
| `storage_location` | VARCHAR(255) | 是 | — | — |
| `edition_name` | VARCHAR(255) | 是 | — | — |
| `language` | VARCHAR(64) | 是 | — | — |
| `bgg_version_id` | INTEGER | 是 | — | — |
| `photo_url` | VARCHAR(1024) | 是 | — | — |
| `remark` | TEXT | 是 | — | — |
| `sort_order` | INTEGER | 否 | — | 0 |
| `entry_source` | VARCHAR(16) | 否 | — | 'manual' |
| `source_username` | VARCHAR(64) COLLATE utf8mb4_bin | 是 | — | — |
| `source_collection_id` | VARCHAR(64) COLLATE utf8mb4_bin | 是 | — | — |
| `source_snapshot` | JSON | 是 | — | — |
| `source_synced_at` | DATETIME(6) | 是 | — | — |
| `archived_at` | DATETIME(6) | 是 | — | — |
| `created_by` | INTEGER | 否 | — | — |
| `updated_by` | INTEGER | 否 | — | — |
| `created_at` | DATETIME(6) | 否 | — | — |
| `updated_at` | DATETIME(6) | 否 | — | — |
| `revision` | INTEGER | 否 | — | 1 |
| `purchase_price` | NUMERIC(14, 2) | 是 | — | — |
| `purchase_currency` | VARCHAR(3) | 是 | — | — |
| `bgg_version_snapshot` | JSON | 是 | — | — |

## boardgame_preferences

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | 是 | — |
| `user_id` | INTEGER | 否 | — | — |
| `game_id` | INTEGER | 否 | — | — |
| `rating` | NUMERIC(3, 1) | 是 | — | — |
| `wishlist` | BOOL | 否 | — | false |
| `preordered` | BOOL | 否 | — | false |
| `want_to_play` | BOOL | 否 | — | false |
| `note` | TEXT | 是 | — | — |
| `created_by` | INTEGER | 否 | — | — |
| `updated_by` | INTEGER | 否 | — | — |
| `created_at` | DATETIME(6) | 否 | — | — |
| `updated_at` | DATETIME(6) | 否 | — | — |
| `revision` | INTEGER | 否 | — | 1 |

## boardgame_prior_plays

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | 是 | — |
| `user_id` | INTEGER | 否 | — | — |
| `game_id` | INTEGER | 否 | — | — |
| `played_before` | BOOL | 否 | — | true |
| `approximate_count` | INTEGER | 是 | — | — |
| `note` | VARCHAR(500) | 是 | — | — |
| `created_by` | INTEGER | 否 | — | — |
| `updated_by` | INTEGER | 否 | — | — |
| `created_at` | DATETIME(6) | 否 | — | — |
| `updated_at` | DATETIME(6) | 否 | — | — |
| `revision` | INTEGER | 否 | — | 1 |

## boardgame_rulesets

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | 是 | — |
| `game_id` | INTEGER | 否 | — | — |
| `name` | VARCHAR(128) | 否 | — | — |
| `configuration` | JSON | 否 | — | — |
| `configuration_hash` | VARCHAR(64) COLLATE utf8mb4_bin | 否 | — | — |
| `archived_at` | DATETIME(6) | 是 | — | — |
| `created_by` | INTEGER | 否 | — | — |
| `updated_by` | INTEGER | 否 | — | — |
| `created_at` | DATETIME(6) | 否 | — | — |
| `updated_at` | DATETIME(6) | 否 | — | — |
| `revision` | INTEGER | 否 | — | 1 |

## boardgame_scoresheet_templates

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | 是 | — |
| `game_id` | INTEGER | 否 | — | — |
| `definition_hash` | VARCHAR(64) COLLATE utf8mb4_bin | 否 | — | — |
| `definition` | JSON | 否 | — | — |
| `semantic_version` | VARCHAR(64) | 否 | — | — |
| `additive_row_keys` | JSON | 否 | — | — |
| `created_by` | INTEGER | 否 | — | — |
| `updated_by` | INTEGER | 否 | — | — |
| `created_at` | DATETIME(6) | 否 | — | — |
| `updated_at` | DATETIME(6) | 否 | — | — |
| `revision` | INTEGER | 否 | — | 1 |
| `name` | VARCHAR(128) | 是 | — | — |
| `template_family` | VARCHAR(64) | 是 | — | — |
| `version_number` | INTEGER | 是 | — | — |
| `selection` | JSON | 是 | — | — |
| `sheet_definition` | JSON | 是 | — | — |
| `is_active` | BOOL | 否 | — | true |

## activity_game_nomination_expansions

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `nomination_id` | INTEGER | 否 | 是 | — |
| `expansion_game_id` | INTEGER | 否 | 是 | — |
| `sort_order` | INTEGER | 否 | — | 0 |
| `modules_note` | VARCHAR(500) | 是 | — | — |
| `compatibility_note` | VARCHAR(500) | 是 | — | — |

## activity_game_plans

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | 是 | — |
| `activity_id` | INTEGER | 否 | — | — |
| `game_id` | INTEGER | 否 | — | — |
| `inventory_id` | INTEGER | 是 | — | — |
| `table_label` | VARCHAR(64) | 是 | — | — |
| `bring_user_id` | INTEGER | 是 | — | — |
| `bring_label` | VARCHAR(64) | 是 | — | — |
| `note` | VARCHAR(1000) | 是 | — | — |
| `sort_order` | INTEGER | 否 | — | 0 |
| `created_by` | INTEGER | 否 | — | — |
| `updated_by` | INTEGER | 否 | — | — |
| `created_at` | DATETIME(6) | 否 | — | — |
| `updated_at` | DATETIME(6) | 否 | — | — |
| `revision` | INTEGER | 否 | — | 1 |

## boardgame_import_items

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | 是 | — |
| `job_id` | VARCHAR(36) COLLATE utf8mb4_bin | 否 | — | — |
| `source_kind` | VARCHAR(32) | 否 | — | — |
| `source_key` | VARCHAR(128) COLLATE utf8mb4_bin | 否 | — | — |
| `bgg_id` | INTEGER | 是 | — | — |
| `raw_xml` | LONGTEXT | 是 | — | — |
| `payload` | JSON | 否 | — | — |
| `content_hash` | VARCHAR(64) COLLATE utf8mb4_bin | 否 | — | — |
| `decision` | JSON | 是 | — | — |
| `target_game_id` | INTEGER | 是 | — | — |
| `target_inventory_id` | INTEGER | 是 | — | — |
| `state` | VARCHAR(32) | 否 | — | 'pending' |
| `error_code` | VARCHAR(64) | 是 | — | — |
| `created_at` | DATETIME(6) | 否 | — | — |
| `updated_at` | DATETIME(6) | 否 | — | — |
| `revision` | INTEGER | 否 | — | 1 |

## activity_game_plan_expansions

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `plan_id` | INTEGER | 否 | 是 | — |
| `expansion_game_id` | INTEGER | 否 | 是 | — |
| `inventory_id` | INTEGER | 是 | — | — |
| `bring_user_id` | INTEGER | 是 | — | — |
| `bring_label` | VARCHAR(64) | 是 | — | — |
| `modules_note` | VARCHAR(500) | 是 | — | — |
| `compatibility_note` | VARCHAR(500) | 是 | — | — |
| `sort_order` | INTEGER | 否 | — | 0 |

## boardgame_inventory_sources

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | 是 | — |
| `inventory_id` | INTEGER | 否 | — | — |
| `provider` | VARCHAR(16) | 否 | — | — |
| `source_namespace` | VARCHAR(128) COLLATE utf8mb4_bin | 否 | — | — |
| `source_id` | VARCHAR(128) COLLATE utf8mb4_bin | 否 | — | — |
| `copy_index` | INTEGER | 否 | — | 1 |
| `source_item_id` | INTEGER | 否 | — | — |
| `content_hash` | VARCHAR(64) COLLATE utf8mb4_bin | 否 | — | — |
| `created_at` | DATETIME(6) | 否 | — | — |
| `updated_at` | DATETIME(6) | 否 | — | — |

## boardgame_plays

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | 是 | — |
| `game_id` | INTEGER | 否 | — | — |
| `activity_id` | INTEGER | 是 | — | — |
| `plan_id` | INTEGER | 是 | — | — |
| `inventory_id` | INTEGER | 是 | — | — |
| `origin` | VARCHAR(16) | 否 | — | 'manual' |
| `publication_status` | VARCHAR(16) | 否 | — | 'held' |
| `stats_exclusion` | VARCHAR(16) | 否 | — | 'none' |
| `original_activity_id` | INTEGER | 是 | — | — |
| `status` | VARCHAR(16) | 否 | — | 'draft' |
| `played_on` | DATE | 是 | — | — |
| `started_at` | DATETIME(6) | 是 | — | — |
| `duration_minutes` | INTEGER | 是 | — | — |
| `location_label` | VARCHAR(255) | 是 | — | — |
| `location_id` | INTEGER | 是 | — | — |
| `play_environment` | VARCHAR(16) | 否 | — | 'unknown' |
| `competition_mode` | VARCHAR(16) | 否 | — | 'unscored' |
| `score_direction` | VARCHAR(16) | 否 | — | 'none' |
| `result_status` | VARCHAR(16) | 否 | — | 'unknown' |
| `tie_policy` | VARCHAR(16) | 否 | — | 'shared_win' |
| `shared_score` | NUMERIC(12, 3) | 是 | — | — |
| `shared_score_status` | VARCHAR(16) | 否 | — | 'unrecorded' |
| `end_reason` | VARCHAR(16) | 是 | — | — |
| `cooperative_result` | VARCHAR(16) | 是 | — | — |
| `rules_snapshot` | JSON | 否 | — | — |
| `comparison_key` | VARCHAR(64) COLLATE utf8mb4_bin | 是 | — | — |
| `game_snapshot` | JSON | 否 | — | — |
| `activity_snapshot` | JSON | 是 | — | — |
| `note` | TEXT | 是 | — | — |
| `change_reason` | VARCHAR(500) | 是 | — | — |
| `created_by` | INTEGER | 否 | — | — |
| `updated_by` | INTEGER | 否 | — | — |
| `created_at` | DATETIME(6) | 否 | — | — |
| `updated_at` | DATETIME(6) | 否 | — | — |
| `revision` | INTEGER | 否 | — | 1 |
| `round_count` | INTEGER | 是 | — | — |
| `result_source` | VARCHAR(24) | 否 | — | 'unknown' |
| `result_reason` | VARCHAR(500) | 是 | — | — |
| `tiebreak_applied` | BOOL | 否 | — | false |
| `exclusion_reason` | VARCHAR(500) | 是 | — | — |
| `timer_status` | VARCHAR(16) | 否 | — | 'idle' |
| `timer_elapsed_seconds` | BIGINT | 否 | — | 0 |
| `timer_resumed_at` | DATETIME(6) | 是 | — | — |
| `timer_stopped_at` | DATETIME(6) | 是 | — | — |

## boardgame_play_expansions

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `play_id` | INTEGER | 否 | 是 | — |
| `expansion_game_id` | INTEGER | 否 | 是 | — |
| `inventory_id` | INTEGER | 是 | — | — |
| `modules_note` | VARCHAR(500) | 是 | — | — |
| `compatibility_note` | VARCHAR(500) | 是 | — | — |
| `game_snapshot` | JSON | 否 | — | — |
| `sort_order` | INTEGER | 否 | — | 0 |

## boardgame_play_observers

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | 是 | — |
| `play_id` | INTEGER | 否 | — | — |
| `person_id` | INTEGER | 是 | — | — |
| `guest_key` | VARCHAR(36) | 是 | — | — |
| `display_name_snapshot` | VARCHAR(64) | 否 | — | — |
| `observer_role` | VARCHAR(16) | 否 | — | — |

## boardgame_play_reports

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | 是 | — |
| `play_id` | INTEGER | 否 | — | — |
| `reported_by` | INTEGER | 否 | — | — |
| `message` | VARCHAR(1000) | 否 | — | — |
| `status` | VARCHAR(16) | 否 | — | 'open' |
| `resolution` | VARCHAR(1000) | 是 | — | — |
| `resolved_by` | INTEGER | 是 | — | — |
| `created_at` | DATETIME(6) | 否 | — | — |
| `updated_at` | DATETIME(6) | 否 | — | — |
| `revision` | INTEGER | 否 | — | 1 |

## boardgame_play_scoresheets

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | 是 | — |
| `play_id` | INTEGER | 否 | — | — |
| `source_item_id` | INTEGER | 是 | — | — |
| `source_sheet_id` | VARCHAR(128) COLLATE utf8mb4_bin | 是 | — | — |
| `schema_version` | INTEGER | 否 | — | 1 |
| `template_key` | VARCHAR(128) COLLATE utf8mb4_bin | 是 | — | — |
| `sheet_comparison_key` | VARCHAR(64) COLLATE utf8mb4_bin | 是 | — | — |
| `parse_status` | VARCHAR(16) | 否 | — | 'partial' |
| `display_data` | JSON | 否 | — | — |
| `issues` | JSON | 否 | — | — |
| `content_hash` | VARCHAR(64) COLLATE utf8mb4_bin | 否 | — | — |
| `projection_version` | INTEGER | 否 | — | 1 |
| `play_revision` | INTEGER | 否 | — | — |
| `created_by` | INTEGER | 否 | — | — |
| `updated_by` | INTEGER | 否 | — | — |
| `created_at` | DATETIME(6) | 否 | — | — |
| `updated_at` | DATETIME(6) | 否 | — | — |
| `revision` | INTEGER | 否 | — | 1 |

## boardgame_play_sources

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | 是 | — |
| `play_id` | INTEGER | 否 | — | — |
| `provider` | VARCHAR(16) | 否 | — | — |
| `source_namespace` | VARCHAR(128) COLLATE utf8mb4_bin | 否 | — | — |
| `source_play_id` | VARCHAR(128) COLLATE utf8mb4_bin | 否 | — | — |
| `segment_index` | INTEGER | 否 | — | 1 |
| `source_item_id` | INTEGER | 否 | — | — |
| `content_hash` | VARCHAR(64) COLLATE utf8mb4_bin | 否 | — | — |
| `source_modified_at` | VARCHAR(64) | 是 | — | — |
| `last_applied_play_revision` | INTEGER | 否 | — | — |
| `mapping_snapshot` | JSON | 否 | — | — |
| `created_at` | DATETIME(6) | 否 | — | — |
| `updated_at` | DATETIME(6) | 否 | — | — |

## boardgame_play_tags

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `play_id` | INTEGER | 否 | 是 | — |
| `tag_id` | INTEGER | 否 | 是 | — |

## boardgame_play_teams

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | 是 | — |
| `play_id` | INTEGER | 否 | — | — |
| `name` | VARCHAR(64) | 否 | — | — |
| `score` | NUMERIC(12, 3) | 是 | — | — |
| `score_status` | VARCHAR(16) | 否 | — | 'unrecorded' |
| `rank` | INTEGER | 是 | — | — |
| `outcome` | VARCHAR(16) | 是 | — | — |
| `sort_order` | INTEGER | 否 | — | 0 |

## boardgame_play_players

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | 是 | — |
| `play_id` | INTEGER | 否 | — | — |
| `person_id` | INTEGER | 是 | — | — |
| `guest_key` | VARCHAR(36) COLLATE utf8mb4_bin | 是 | — | — |
| `display_name_snapshot` | VARCHAR(64) | 否 | — | — |
| `avatar_snapshot` | VARCHAR(1024) | 是 | — | — |
| `team_id` | INTEGER | 是 | — | — |
| `score` | NUMERIC(12, 3) | 是 | — | — |
| `score_status` | VARCHAR(16) | 否 | — | 'unrecorded' |
| `rank` | INTEGER | 是 | — | — |
| `outcome` | VARCHAR(16) | 是 | — | — |
| `seat_order` | INTEGER | 否 | — | — |
| `is_start_player` | BOOL | 否 | — | false |
| `role_label` | VARCHAR(100) | 是 | — | — |
| `is_new_to_player` | BOOL | 是 | — | — |
| `participant_kind` | VARCHAR(16) | 否 | — | 'human' |

## boardgame_scoresheet_cells

| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |
| --- | --- | --- | --- | --- |
| `id` | INTEGER | 否 | 是 | — |
| `sheet_id` | INTEGER | 否 | — | — |
| `play_id` | INTEGER | 否 | — | — |
| `row_key` | VARCHAR(128) COLLATE utf8mb4_bin | 否 | — | — |
| `group_key` | VARCHAR(128) COLLATE utf8mb4_bin | 否 | — | — |
| `row_label` | VARCHAR(255) | 否 | — | — |
| `row_order` | INTEGER | 否 | — | 0 |
| `subject_kind` | VARCHAR(16) | 否 | — | — |
| `subject_key` | VARCHAR(64) COLLATE utf8mb4_bin | 否 | — | — |
| `player_id` | INTEGER | 是 | — | — |
| `team_id` | INTEGER | 是 | — | — |
| `value_number` | NUMERIC(18, 6) | 是 | — | — |
| `value_text` | VARCHAR(1000) | 是 | — | — |
| `is_aggregate` | BOOL | 否 | — | false |
| `projection_version` | INTEGER | 否 | — | — |
