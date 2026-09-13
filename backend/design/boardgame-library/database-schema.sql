-- v3.3 generated reference: 34 domain tables. Apply Alembic 0013 + 0014 + 0015 for deployment.
-- Requires existing users and activities tables. Values and times are assigned by services.

CREATE TABLE `boardgame_audit_events` (
	`id` INTEGER NOT NULL AUTO_INCREMENT,
	`entity_type` VARCHAR(32) NOT NULL,
	`entity_id` VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
	`entity_revision` INTEGER NOT NULL,
	`action` VARCHAR(32) NOT NULL,
	`actor_user_id` INTEGER,
	`before_data` JSON,
	`after_data` JSON,
	`reason` VARCHAR(1000),
	`request_id` VARCHAR(64),
	`created_at` DATETIME(6) NOT NULL,
	PRIMARY KEY (`id`),
	CONSTRAINT `fk_audit_actor` FOREIGN KEY(`actor_user_id`) REFERENCES `users` (`id`)
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE INDEX `ix_audit_entity` ON `boardgame_audit_events` (`entity_type`, `entity_id`, `id`);

CREATE TABLE `boardgame_import_jobs` (
	`id` VARCHAR(36) COLLATE utf8mb4_bin NOT NULL,
	`kind` VARCHAR(32) NOT NULL,
	`requested_by` INTEGER NOT NULL,
	`params` JSON NOT NULL,
	`state` VARCHAR(32) NOT NULL DEFAULT 'queued',
	`progress` JSON NOT NULL,
	`error_code` VARCHAR(255),
	`error_message` VARCHAR(255),
	`attempt_count` INTEGER NOT NULL DEFAULT 0,
	`next_attempt_at` DATETIME(6),
	`lease_owner` VARCHAR(64),
	`lease_expires_at` DATETIME(6),
	`created_at` DATETIME(6) NOT NULL,
	`updated_at` DATETIME(6) NOT NULL,
	`revision` INTEGER NOT NULL DEFAULT 1,
	PRIMARY KEY (`id`),
	CONSTRAINT `fk_import_job_actor` FOREIGN KEY(`requested_by`) REFERENCES `users` (`id`),
	CONSTRAINT `ck_import_job_kind` CHECK (kind IN ('bgg_thing','bgg_collection','bgg_plays','bgstats_file')),
	CONSTRAINT `ck_import_job_state` CHECK (state IN ('queued','fetching','parsing','retry_wait','ready','applying','applied','partial','failed')),
	CONSTRAINT `ck_import_job_revision` CHECK (revision >= 1),
	CONSTRAINT `ck_import_job_attempt` CHECK (attempt_count >= 0)
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE INDEX `ix_import_job_author` ON `boardgame_import_jobs` (`requested_by`, `created_at`);
CREATE INDEX `ix_import_job_queue` ON `boardgame_import_jobs` (`state`, `next_attempt_at`, `lease_expires_at`);

CREATE TABLE `boardgame_locations` (
	`id` INTEGER NOT NULL AUTO_INCREMENT,
	`name` VARCHAR(255) NOT NULL,
	`is_visible` BOOL NOT NULL DEFAULT false,
	`archived_at` DATETIME(6),
	`created_by` INTEGER NOT NULL,
	`updated_by` INTEGER NOT NULL,
	`created_at` DATETIME(6) NOT NULL,
	`updated_at` DATETIME(6) NOT NULL,
	`revision` INTEGER NOT NULL DEFAULT 1,
	PRIMARY KEY (`id`),
	CONSTRAINT `fk_location_creator` FOREIGN KEY(`created_by`) REFERENCES `users` (`id`),
	CONSTRAINT `fk_location_updater` FOREIGN KEY(`updated_by`) REFERENCES `users` (`id`),
	CONSTRAINT `ck_location_revision` CHECK (revision >= 1),
	CONSTRAINT `ck_location_name` CHECK (length(TRIM(name)) > 0)
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE INDEX `ix_location_options` ON `boardgame_locations` (`is_visible`, `archived_at`, `id`);

CREATE TABLE `boardgame_people` (
	`id` INTEGER NOT NULL AUTO_INCREMENT,
	`user_id` INTEGER,
	`display_name` VARCHAR(64) NOT NULL,
	`is_visible` BOOL NOT NULL DEFAULT false,
	`archived_at` DATETIME(6),
	`merged_into_id` INTEGER,
	`created_by` INTEGER NOT NULL,
	`updated_by` INTEGER NOT NULL,
	`created_at` DATETIME(6) NOT NULL,
	`updated_at` DATETIME(6) NOT NULL,
	`revision` INTEGER NOT NULL DEFAULT 1,
	PRIMARY KEY (`id`),
	CONSTRAINT `uq_person_user` UNIQUE (`user_id`),
	CONSTRAINT `fk_person_user` FOREIGN KEY(`user_id`) REFERENCES `users` (`id`),
	CONSTRAINT `fk_person_merge` FOREIGN KEY(`merged_into_id`) REFERENCES `boardgame_people` (`id`),
	CONSTRAINT `fk_person_creator` FOREIGN KEY(`created_by`) REFERENCES `users` (`id`),
	CONSTRAINT `fk_person_updater` FOREIGN KEY(`updated_by`) REFERENCES `users` (`id`),
	CONSTRAINT `ck_person_revision` CHECK (revision >= 1),
	CONSTRAINT `ck_person_name` CHECK (length(TRIM(display_name)) > 0)
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE INDEX `ix_person_options` ON `boardgame_people` (`is_visible`, `archived_at`, `id`);

CREATE TABLE `boardgame_request_keys` (
	`id` INTEGER NOT NULL AUTO_INCREMENT,
	`actor_user_id` INTEGER NOT NULL,
	`operation` VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
	`key` VARCHAR(36) COLLATE utf8mb4_bin NOT NULL,
	`request_hash` VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
	`resource_type` VARCHAR(32) NOT NULL,
	`resource_ids` JSON NOT NULL,
	`created_at` DATETIME(6) NOT NULL,
	PRIMARY KEY (`id`),
	CONSTRAINT `fk_request_actor` FOREIGN KEY(`actor_user_id`) REFERENCES `users` (`id`),
	CONSTRAINT `uq_request_key` UNIQUE (`actor_user_id`, `operation`, `key`)
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `boardgame_saved_filters` (
	`id` INTEGER NOT NULL AUTO_INCREMENT,
	`user_id` INTEGER NOT NULL,
	`name` VARCHAR(64) NOT NULL,
	`target` VARCHAR(16) NOT NULL,
	`query` JSON NOT NULL,
	`created_by` INTEGER NOT NULL,
	`updated_by` INTEGER NOT NULL,
	`created_at` DATETIME(6) NOT NULL,
	`updated_at` DATETIME(6) NOT NULL,
	`revision` INTEGER NOT NULL DEFAULT 1,
	PRIMARY KEY (`id`),
	CONSTRAINT `fk_saved_filter_user` FOREIGN KEY(`user_id`) REFERENCES `users` (`id`),
	CONSTRAINT `uq_saved_filter_name` UNIQUE (`user_id`, `name`),
	CONSTRAINT `ck_saved_filter_target` CHECK (target IN ('games','plays','statistics')),
	CONSTRAINT `fk_saved_filters_creator` FOREIGN KEY(`created_by`) REFERENCES `users` (`id`),
	CONSTRAINT `fk_saved_filters_updater` FOREIGN KEY(`updated_by`) REFERENCES `users` (`id`),
	CONSTRAINT `ck_saved_filters_revision` CHECK (revision >= 1)
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `boardgame_sync_operations` (
	`id` INTEGER NOT NULL AUTO_INCREMENT,
	`user_id` INTEGER NOT NULL,
	`client_id` VARCHAR(36) NOT NULL,
	`operation_id` VARCHAR(36) NOT NULL,
	`request_hash` VARCHAR(64) NOT NULL,
	`response` JSON NOT NULL,
	`created_at` DATETIME(6) NOT NULL,
	PRIMARY KEY (`id`),
	CONSTRAINT `fk_sync_user` FOREIGN KEY(`user_id`) REFERENCES `users` (`id`),
	CONSTRAINT `uq_sync_operation` UNIQUE (`user_id`, `client_id`, `operation_id`)
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE INDEX `ix_sync_user_id` ON `boardgame_sync_operations` (`user_id`, `id`);

CREATE TABLE `boardgame_tags` (
	`id` INTEGER NOT NULL AUTO_INCREMENT,
	`user_id` INTEGER NOT NULL,
	`name` VARCHAR(64) NOT NULL,
	`is_active` BOOL NOT NULL DEFAULT true,
	`created_by` INTEGER NOT NULL,
	`updated_by` INTEGER NOT NULL,
	`created_at` DATETIME(6) NOT NULL,
	`updated_at` DATETIME(6) NOT NULL,
	`revision` INTEGER NOT NULL DEFAULT 1,
	PRIMARY KEY (`id`),
	CONSTRAINT `fk_tag_user` FOREIGN KEY(`user_id`) REFERENCES `users` (`id`),
	CONSTRAINT `uq_tag_name` UNIQUE (`user_id`, `name`),
	CONSTRAINT `fk_tags_creator` FOREIGN KEY(`created_by`) REFERENCES `users` (`id`),
	CONSTRAINT `fk_tags_updater` FOREIGN KEY(`updated_by`) REFERENCES `users` (`id`),
	CONSTRAINT `ck_tags_revision` CHECK (revision >= 1)
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `boardgames` (
	`id` INTEGER NOT NULL AUTO_INCREMENT,
	`bgg_id` INTEGER,
	`name` VARCHAR(255) NOT NULL,
	`aliases` JSON NOT NULL,
	`game_type` VARCHAR(16) NOT NULL,
	`is_standalone` BOOL NOT NULL DEFAULT false,
	`cover_url` VARCHAR(1024),
	`description` TEXT,
	`min_players` INTEGER,
	`max_players` INTEGER,
	`min_playtime_minutes` INTEGER,
	`max_playtime_minutes` INTEGER,
	`min_age` INTEGER,
	`year_published` INTEGER,
	`local_overrides` JSON NOT NULL,
	`search_text` TEXT NOT NULL,
	`default_rules` JSON NOT NULL,
	`is_visible` BOOL NOT NULL DEFAULT true,
	`sort_order` INTEGER NOT NULL DEFAULT 0,
	`archived_at` DATETIME(6),
	`merged_into_id` INTEGER,
	`bgg_payload` JSON,
	`bgg_raw_xml` LONGTEXT,
	`bgg_request_params` JSON,
	`bgg_synced_at` DATETIME(6),
	`bgg_parser_version` VARCHAR(32),
	`bgg_content_hash` VARCHAR(64) COLLATE utf8mb4_bin,
	`projection_warnings` JSON NOT NULL,
	`created_by` INTEGER NOT NULL,
	`updated_by` INTEGER NOT NULL,
	`created_at` DATETIME(6) NOT NULL,
	`updated_at` DATETIME(6) NOT NULL,
	`revision` INTEGER NOT NULL DEFAULT 1,
	`complexity` NUMERIC(4, 2),
	PRIMARY KEY (`id`),
	CONSTRAINT `uq_bg_bgg` UNIQUE (`bgg_id`),
	CONSTRAINT `fk_bg_merged` FOREIGN KEY(`merged_into_id`) REFERENCES `boardgames` (`id`),
	CONSTRAINT `ck_bg_type` CHECK (game_type IN ('base','expansion')),
	CONSTRAINT `ck_bg_bgg` CHECK (bgg_id IS NULL OR bgg_id > 0),
	CONSTRAINT `ck_bg_players` CHECK ((min_players IS NULL OR min_players > 0) AND (max_players IS NULL OR max_players > 0) AND (min_players IS NULL OR max_players IS NULL OR min_players <= max_players)),
	CONSTRAINT `ck_bg_time` CHECK ((min_playtime_minutes IS NULL OR min_playtime_minutes > 0) AND (max_playtime_minutes IS NULL OR max_playtime_minutes > 0) AND (min_playtime_minutes IS NULL OR max_playtime_minutes IS NULL OR min_playtime_minutes <= max_playtime_minutes)),
	CONSTRAINT `ck_bg_age` CHECK (min_age IS NULL OR min_age >= 0),
	CONSTRAINT `bg1_creator` FOREIGN KEY(`created_by`) REFERENCES `users` (`id`),
	CONSTRAINT `bg1_updater` FOREIGN KEY(`updated_by`) REFERENCES `users` (`id`),
	CONSTRAINT `bg1_revision` CHECK (revision >= 1),
	CONSTRAINT `ck_game_complexity` CHECK (complexity IS NULL OR complexity BETWEEN 1 AND 5)
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE INDEX `ix_bg_library` ON `boardgames` (`is_visible`, `archived_at`, `sort_order`, `id`);
CREATE INDEX `ix_bg_type` ON `boardgames` (`game_type`, `archived_at`);

CREATE TABLE `activity_game_nominations` (
	`id` INTEGER NOT NULL AUTO_INCREMENT,
	`activity_id` INTEGER NOT NULL,
	`game_id` INTEGER NOT NULL,
	`user_id` INTEGER NOT NULL,
	`state` VARCHAR(16) NOT NULL DEFAULT 'active',
	`frozen_at` DATETIME(6),
	`note` VARCHAR(500),
	`created_by` INTEGER NOT NULL,
	`updated_by` INTEGER NOT NULL,
	`created_at` DATETIME(6) NOT NULL,
	`updated_at` DATETIME(6) NOT NULL,
	`revision` INTEGER NOT NULL DEFAULT 1,
	PRIMARY KEY (`id`),
	CONSTRAINT `fk_nom_activity` FOREIGN KEY(`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_nom_game` FOREIGN KEY(`game_id`) REFERENCES `boardgames` (`id`),
	CONSTRAINT `fk_nom_user` FOREIGN KEY(`user_id`) REFERENCES `users` (`id`),
	CONSTRAINT `uq_nom_vote` UNIQUE (`activity_id`, `game_id`, `user_id`),
	CONSTRAINT `ck_nom_state` CHECK (state IN ('active','frozen','withdrawn','ineligible','removed')),
	CONSTRAINT `bg5_creator` FOREIGN KEY(`created_by`) REFERENCES `users` (`id`),
	CONSTRAINT `bg5_updater` FOREIGN KEY(`updated_by`) REFERENCES `users` (`id`),
	CONSTRAINT `bg5_revision` CHECK (revision >= 1)
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE INDEX `ix_nom_game` ON `activity_game_nominations` (`game_id`, `state`, `user_id`, `activity_id`);
CREATE INDEX `ix_nom_user` ON `activity_game_nominations` (`user_id`, `state`, `activity_id`);

CREATE TABLE `activity_game_settings` (
	`activity_id` INTEGER NOT NULL,
	`frozen_at` DATETIME(6),
	`cutoff_snapshot` DATETIME(6),
	`revision` INTEGER NOT NULL DEFAULT 1,
	PRIMARY KEY (`activity_id`),
	CONSTRAINT `fk_game_settings_activity` FOREIGN KEY(`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE,
	CONSTRAINT `ck_game_settings_revision` CHECK (revision >= 1)
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `boardgame_expansion_links` (
	`base_game_id` INTEGER NOT NULL,
	`expansion_game_id` INTEGER NOT NULL,
	`bgg_suggested` BOOL NOT NULL DEFAULT false,
	`manual_decision` VARCHAR(16) NOT NULL DEFAULT 'inherit',
	`note` VARCHAR(500),
	`updated_by` INTEGER NOT NULL,
	`updated_at` DATETIME(6) NOT NULL,
	`revision` INTEGER NOT NULL DEFAULT 1,
	PRIMARY KEY (`base_game_id`, `expansion_game_id`),
	CONSTRAINT `fk_compat_base` FOREIGN KEY(`base_game_id`) REFERENCES `boardgames` (`id`),
	CONSTRAINT `fk_compat_expansion` FOREIGN KEY(`expansion_game_id`) REFERENCES `boardgames` (`id`),
	CONSTRAINT `fk_compat_actor` FOREIGN KEY(`updated_by`) REFERENCES `users` (`id`),
	CONSTRAINT `ck_compat_decision` CHECK (manual_decision IN ('inherit','allow','block')),
	CONSTRAINT `ck_compat_revision` CHECK (revision >= 1)
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `boardgame_game_tags` (
	`game_id` INTEGER NOT NULL,
	`tag_id` INTEGER NOT NULL,
	PRIMARY KEY (`game_id`, `tag_id`),
	CONSTRAINT `fk_game_tag_game` FOREIGN KEY(`game_id`) REFERENCES `boardgames` (`id`),
	CONSTRAINT `fk_game_tag_tag` FOREIGN KEY(`tag_id`) REFERENCES `boardgame_tags` (`id`) ON DELETE CASCADE
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `boardgame_import_mappings` (
	`id` INTEGER NOT NULL AUTO_INCREMENT,
	`provider` VARCHAR(16) NOT NULL,
	`source_namespace` VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
	`entity_type` VARCHAR(16) NOT NULL,
	`external_id` VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
	`target_game_id` INTEGER,
	`target_person_id` INTEGER,
	`target_location_id` INTEGER,
	`confirmed_by` INTEGER NOT NULL,
	`created_at` DATETIME(6) NOT NULL,
	`updated_at` DATETIME(6) NOT NULL,
	`revision` INTEGER NOT NULL DEFAULT 1,
	PRIMARY KEY (`id`),
	CONSTRAINT `fk_mapping_game` FOREIGN KEY(`target_game_id`) REFERENCES `boardgames` (`id`),
	CONSTRAINT `fk_mapping_person` FOREIGN KEY(`target_person_id`) REFERENCES `boardgame_people` (`id`),
	CONSTRAINT `fk_mapping_location` FOREIGN KEY(`target_location_id`) REFERENCES `boardgame_locations` (`id`),
	CONSTRAINT `fk_mapping_actor` FOREIGN KEY(`confirmed_by`) REFERENCES `users` (`id`),
	CONSTRAINT `uq_mapping_identity` UNIQUE (`provider`, `source_namespace`, `entity_type`, `external_id`),
	CONSTRAINT `ck_mapping_provider` CHECK (provider IN ('bgg','bgstats')),
	CONSTRAINT `ck_mapping_target` CHECK ((entity_type='game' AND target_game_id IS NOT NULL AND target_person_id IS NULL AND target_location_id IS NULL) OR (entity_type='player' AND target_game_id IS NULL AND target_person_id IS NOT NULL AND target_location_id IS NULL) OR (entity_type='location' AND target_game_id IS NULL AND target_person_id IS NULL AND target_location_id IS NOT NULL)),
	CONSTRAINT `ck_mapping_revision` CHECK (revision >= 1)
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `boardgame_inventory` (
	`id` INTEGER NOT NULL AUTO_INCREMENT,
	`game_id` INTEGER NOT NULL,
	`owner_type` VARCHAR(16) NOT NULL,
	`owner_user_id` INTEGER,
	`owner_label` VARCHAR(64),
	`status` VARCHAR(16) NOT NULL DEFAULT 'unverified',
	`available_for_activity` BOOL NOT NULL DEFAULT false,
	`purchased_on` DATE,
	`storage_location` VARCHAR(255),
	`edition_name` VARCHAR(255),
	`language` VARCHAR(64),
	`bgg_version_id` INTEGER,
	`photo_url` VARCHAR(1024),
	`remark` TEXT,
	`sort_order` INTEGER NOT NULL DEFAULT 0,
	`entry_source` VARCHAR(16) NOT NULL DEFAULT 'manual',
	`source_username` VARCHAR(64) COLLATE utf8mb4_bin,
	`source_collection_id` VARCHAR(64) COLLATE utf8mb4_bin,
	`source_snapshot` JSON,
	`source_synced_at` DATETIME(6),
	`archived_at` DATETIME(6),
	`created_by` INTEGER NOT NULL,
	`updated_by` INTEGER NOT NULL,
	`created_at` DATETIME(6) NOT NULL,
	`updated_at` DATETIME(6) NOT NULL,
	`revision` INTEGER NOT NULL DEFAULT 1,
	`purchase_price` NUMERIC(14, 2),
	`purchase_currency` VARCHAR(3),
	`bgg_version_snapshot` JSON,
	PRIMARY KEY (`id`),
	CONSTRAINT `fk_inventory_game` FOREIGN KEY(`game_id`) REFERENCES `boardgames` (`id`),
	CONSTRAINT `fk_inventory_owner` FOREIGN KEY(`owner_user_id`) REFERENCES `users` (`id`),
	CONSTRAINT `uq_inventory_source` UNIQUE (`source_username`, `source_collection_id`),
	CONSTRAINT `ck_inventory_owner` CHECK ((owner_type='member' AND owner_user_id IS NOT NULL AND owner_label IS NULL) OR (owner_type='external' AND owner_user_id IS NULL AND owner_label IS NOT NULL AND length(TRIM(owner_label)) > 0) OR (owner_type='club' AND owner_user_id IS NULL AND owner_label IS NULL)),
	CONSTRAINT `ck_inventory_status` CHECK (status IN ('unverified','available','borrowed','unavailable','retired')),
	CONSTRAINT `ck_inventory_entry` CHECK (entry_source IN ('manual','bgg_collection','bgstats')),
	CONSTRAINT `ck_inventory_source` CHECK ((source_username IS NULL AND source_collection_id IS NULL) OR (source_username IS NOT NULL AND source_collection_id IS NOT NULL)),
	CONSTRAINT `bg2_creator` FOREIGN KEY(`created_by`) REFERENCES `users` (`id`),
	CONSTRAINT `bg2_updater` FOREIGN KEY(`updated_by`) REFERENCES `users` (`id`),
	CONSTRAINT `bg2_revision` CHECK (revision >= 1),
	CONSTRAINT `ck_inventory_price` CHECK (purchase_price IS NULL OR purchase_price >= 0),
	CONSTRAINT `ck_inventory_currency` CHECK ((purchase_price IS NULL AND purchase_currency IS NULL) OR (purchase_price IS NOT NULL AND purchase_currency IS NOT NULL))
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE INDEX `ix_inventory_available` ON `boardgame_inventory` (`game_id`, `status`, `available_for_activity`);
CREATE INDEX `ix_inventory_owner` ON `boardgame_inventory` (`owner_user_id`, `archived_at`, `id`);

CREATE TABLE `boardgame_preferences` (
	`id` INTEGER NOT NULL AUTO_INCREMENT,
	`user_id` INTEGER NOT NULL,
	`game_id` INTEGER NOT NULL,
	`rating` NUMERIC(3, 1),
	`wishlist` BOOL NOT NULL DEFAULT false,
	`preordered` BOOL NOT NULL DEFAULT false,
	`want_to_play` BOOL NOT NULL DEFAULT false,
	`note` TEXT,
	`created_by` INTEGER NOT NULL,
	`updated_by` INTEGER NOT NULL,
	`created_at` DATETIME(6) NOT NULL,
	`updated_at` DATETIME(6) NOT NULL,
	`revision` INTEGER NOT NULL DEFAULT 1,
	PRIMARY KEY (`id`),
	CONSTRAINT `fk_preference_user` FOREIGN KEY(`user_id`) REFERENCES `users` (`id`),
	CONSTRAINT `fk_preference_game` FOREIGN KEY(`game_id`) REFERENCES `boardgames` (`id`),
	CONSTRAINT `uq_preference_user_game` UNIQUE (`user_id`, `game_id`),
	CONSTRAINT `ck_preference_rating` CHECK (rating IS NULL OR rating BETWEEN 1 AND 10),
	CONSTRAINT `fk_preferences_creator` FOREIGN KEY(`created_by`) REFERENCES `users` (`id`),
	CONSTRAINT `fk_preferences_updater` FOREIGN KEY(`updated_by`) REFERENCES `users` (`id`),
	CONSTRAINT `ck_preferences_revision` CHECK (revision >= 1)
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `boardgame_prior_plays` (
	`id` INTEGER NOT NULL AUTO_INCREMENT,
	`user_id` INTEGER NOT NULL,
	`game_id` INTEGER NOT NULL,
	`played_before` BOOL NOT NULL DEFAULT true,
	`approximate_count` INTEGER,
	`note` VARCHAR(500),
	`created_by` INTEGER NOT NULL,
	`updated_by` INTEGER NOT NULL,
	`created_at` DATETIME(6) NOT NULL,
	`updated_at` DATETIME(6) NOT NULL,
	`revision` INTEGER NOT NULL DEFAULT 1,
	PRIMARY KEY (`id`),
	CONSTRAINT `fk_prior_user` FOREIGN KEY(`user_id`) REFERENCES `users` (`id`),
	CONSTRAINT `fk_prior_game` FOREIGN KEY(`game_id`) REFERENCES `boardgames` (`id`),
	CONSTRAINT `uq_prior_user_game` UNIQUE (`user_id`, `game_id`),
	CONSTRAINT `ck_prior_count` CHECK (approximate_count IS NULL OR approximate_count BETWEEN 1 AND 1000000),
	CONSTRAINT `fk_prior_plays_creator` FOREIGN KEY(`created_by`) REFERENCES `users` (`id`),
	CONSTRAINT `fk_prior_plays_updater` FOREIGN KEY(`updated_by`) REFERENCES `users` (`id`),
	CONSTRAINT `ck_prior_plays_revision` CHECK (revision >= 1)
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `boardgame_rulesets` (
	`id` INTEGER NOT NULL AUTO_INCREMENT,
	`game_id` INTEGER NOT NULL,
	`name` VARCHAR(128) NOT NULL,
	`configuration` JSON NOT NULL,
	`configuration_hash` VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
	`archived_at` DATETIME(6),
	`created_by` INTEGER NOT NULL,
	`updated_by` INTEGER NOT NULL,
	`created_at` DATETIME(6) NOT NULL,
	`updated_at` DATETIME(6) NOT NULL,
	`revision` INTEGER NOT NULL DEFAULT 1,
	PRIMARY KEY (`id`),
	CONSTRAINT `uq_ruleset_configuration` UNIQUE (`game_id`, `configuration_hash`),
	CONSTRAINT `fk_ruleset_game` FOREIGN KEY(`game_id`) REFERENCES `boardgames` (`id`),
	CONSTRAINT `fk_ruleset_creator` FOREIGN KEY(`created_by`) REFERENCES `users` (`id`),
	CONSTRAINT `fk_ruleset_updater` FOREIGN KEY(`updated_by`) REFERENCES `users` (`id`),
	CONSTRAINT `ck_ruleset_revision` CHECK (revision >= 1)
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `boardgame_scoresheet_templates` (
	`id` INTEGER NOT NULL AUTO_INCREMENT,
	`game_id` INTEGER NOT NULL,
	`definition_hash` VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
	`definition` JSON NOT NULL,
	`semantic_version` VARCHAR(64) NOT NULL,
	`additive_row_keys` JSON NOT NULL,
	`created_by` INTEGER NOT NULL,
	`updated_by` INTEGER NOT NULL,
	`created_at` DATETIME(6) NOT NULL,
	`updated_at` DATETIME(6) NOT NULL,
	`revision` INTEGER NOT NULL DEFAULT 1,
	`name` VARCHAR(128),
	`template_family` VARCHAR(64),
	`version_number` INTEGER,
	`selection` JSON,
	`sheet_definition` JSON,
	`is_active` BOOL NOT NULL DEFAULT true,
	PRIMARY KEY (`id`),
	CONSTRAINT `uq_sheet_template_definition` UNIQUE (`game_id`, `definition_hash`),
	CONSTRAINT `fk_template_game` FOREIGN KEY(`game_id`) REFERENCES `boardgames` (`id`),
	CONSTRAINT `fk_template_creator` FOREIGN KEY(`created_by`) REFERENCES `users` (`id`),
	CONSTRAINT `fk_template_updater` FOREIGN KEY(`updated_by`) REFERENCES `users` (`id`),
	CONSTRAINT `ck_template_revision` CHECK (revision >= 1),
	CONSTRAINT `uq_template_version` UNIQUE (`game_id`, `template_family`, `version_number`),
	CONSTRAINT `ck_template_version` CHECK (version_number IS NULL OR version_number >= 1)
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `activity_game_nomination_expansions` (
	`nomination_id` INTEGER NOT NULL,
	`expansion_game_id` INTEGER NOT NULL,
	`sort_order` INTEGER NOT NULL DEFAULT 0,
	`modules_note` VARCHAR(500),
	`compatibility_note` VARCHAR(500),
	PRIMARY KEY (`nomination_id`, `expansion_game_id`),
	CONSTRAINT `fk_nomexp_nom` FOREIGN KEY(`nomination_id`) REFERENCES `activity_game_nominations` (`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_nomexp_game` FOREIGN KEY(`expansion_game_id`) REFERENCES `boardgames` (`id`)
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `activity_game_plans` (
	`id` INTEGER NOT NULL AUTO_INCREMENT,
	`activity_id` INTEGER NOT NULL,
	`game_id` INTEGER NOT NULL,
	`inventory_id` INTEGER,
	`table_label` VARCHAR(64),
	`bring_user_id` INTEGER,
	`bring_label` VARCHAR(64),
	`note` VARCHAR(1000),
	`sort_order` INTEGER NOT NULL DEFAULT 0,
	`created_by` INTEGER NOT NULL,
	`updated_by` INTEGER NOT NULL,
	`created_at` DATETIME(6) NOT NULL,
	`updated_at` DATETIME(6) NOT NULL,
	`revision` INTEGER NOT NULL DEFAULT 1,
	PRIMARY KEY (`id`),
	CONSTRAINT `fk_plan_activity` FOREIGN KEY(`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_plan_game` FOREIGN KEY(`game_id`) REFERENCES `boardgames` (`id`),
	CONSTRAINT `fk_plan_inventory` FOREIGN KEY(`inventory_id`) REFERENCES `boardgame_inventory` (`id`),
	CONSTRAINT `fk_plan_bringer` FOREIGN KEY(`bring_user_id`) REFERENCES `users` (`id`),
	CONSTRAINT `ck_plan_bringer` CHECK (bring_user_id IS NULL OR bring_label IS NULL),
	CONSTRAINT `bg7_creator` FOREIGN KEY(`created_by`) REFERENCES `users` (`id`),
	CONSTRAINT `bg7_updater` FOREIGN KEY(`updated_by`) REFERENCES `users` (`id`),
	CONSTRAINT `bg7_revision` CHECK (revision >= 1)
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE INDEX `ix_plan_inventory` ON `activity_game_plans` (`inventory_id`, `activity_id`);
CREATE INDEX `ix_plan_order` ON `activity_game_plans` (`activity_id`, `sort_order`, `id`);

CREATE TABLE `boardgame_import_items` (
	`id` INTEGER NOT NULL AUTO_INCREMENT,
	`job_id` VARCHAR(36) COLLATE utf8mb4_bin NOT NULL,
	`source_kind` VARCHAR(32) NOT NULL,
	`source_key` VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
	`bgg_id` INTEGER,
	`raw_xml` LONGTEXT,
	`payload` JSON NOT NULL,
	`content_hash` VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
	`decision` JSON,
	`target_game_id` INTEGER,
	`target_inventory_id` INTEGER,
	`state` VARCHAR(32) NOT NULL DEFAULT 'pending',
	`error_code` VARCHAR(64),
	`created_at` DATETIME(6) NOT NULL,
	`updated_at` DATETIME(6) NOT NULL,
	`revision` INTEGER NOT NULL DEFAULT 1,
	PRIMARY KEY (`id`),
	CONSTRAINT `fk_import_item_job` FOREIGN KEY(`job_id`) REFERENCES `boardgame_import_jobs` (`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_import_item_game` FOREIGN KEY(`target_game_id`) REFERENCES `boardgames` (`id`),
	CONSTRAINT `fk_import_item_inventory` FOREIGN KEY(`target_inventory_id`) REFERENCES `boardgame_inventory` (`id`),
	CONSTRAINT `uq_import_item_source` UNIQUE (`job_id`, `source_kind`, `source_key`),
	CONSTRAINT `ck_import_item_state` CHECK (state IN ('pending','ready','needs_mapping','needs_review','applied','linked','skipped','failed')),
	CONSTRAINT `ck_import_item_revision` CHECK (revision >= 1)
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE INDEX `ix_import_item_state` ON `boardgame_import_items` (`job_id`, `state`, `id`);

CREATE TABLE `activity_game_plan_expansions` (
	`plan_id` INTEGER NOT NULL,
	`expansion_game_id` INTEGER NOT NULL,
	`inventory_id` INTEGER,
	`bring_user_id` INTEGER,
	`bring_label` VARCHAR(64),
	`modules_note` VARCHAR(500),
	`compatibility_note` VARCHAR(500),
	`sort_order` INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY (`plan_id`, `expansion_game_id`),
	CONSTRAINT `fk_planexp_plan` FOREIGN KEY(`plan_id`) REFERENCES `activity_game_plans` (`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_planexp_game` FOREIGN KEY(`expansion_game_id`) REFERENCES `boardgames` (`id`),
	CONSTRAINT `fk_planexp_inventory` FOREIGN KEY(`inventory_id`) REFERENCES `boardgame_inventory` (`id`),
	CONSTRAINT `fk_planexp_bringer` FOREIGN KEY(`bring_user_id`) REFERENCES `users` (`id`),
	CONSTRAINT `ck_planexp_bringer` CHECK (bring_user_id IS NULL OR bring_label IS NULL)
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE INDEX `ix_planexp_inventory` ON `activity_game_plan_expansions` (`inventory_id`, `plan_id`);

CREATE TABLE `boardgame_inventory_sources` (
	`id` INTEGER NOT NULL AUTO_INCREMENT,
	`inventory_id` INTEGER NOT NULL,
	`provider` VARCHAR(16) NOT NULL,
	`source_namespace` VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
	`source_id` VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
	`copy_index` INTEGER NOT NULL DEFAULT 1,
	`source_item_id` INTEGER NOT NULL,
	`content_hash` VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
	`created_at` DATETIME(6) NOT NULL,
	`updated_at` DATETIME(6) NOT NULL,
	PRIMARY KEY (`id`),
	CONSTRAINT `uq_inventory_provider_source` UNIQUE (`provider`, `source_namespace`, `source_id`, `copy_index`),
	CONSTRAINT `fk_inventory_source_box` FOREIGN KEY(`inventory_id`) REFERENCES `boardgame_inventory` (`id`),
	CONSTRAINT `fk_inventory_source_item` FOREIGN KEY(`source_item_id`) REFERENCES `boardgame_import_items` (`id`),
	CONSTRAINT `ck_inventory_provider` CHECK (provider IN ('bgg','bgstats')),
	CONSTRAINT `ck_inventory_copy` CHECK (copy_index >= 1)
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `boardgame_plays` (
	`id` INTEGER NOT NULL AUTO_INCREMENT,
	`game_id` INTEGER NOT NULL,
	`activity_id` INTEGER,
	`plan_id` INTEGER,
	`inventory_id` INTEGER,
	`origin` VARCHAR(16) NOT NULL DEFAULT 'manual',
	`publication_status` VARCHAR(16) NOT NULL DEFAULT 'held',
	`stats_exclusion` VARCHAR(16) NOT NULL DEFAULT 'none',
	`original_activity_id` INTEGER,
	`status` VARCHAR(16) NOT NULL DEFAULT 'draft',
	`played_on` DATE,
	`started_at` DATETIME(6),
	`duration_minutes` INTEGER,
	`location_label` VARCHAR(255),
	`location_id` INTEGER,
	`play_environment` VARCHAR(16) NOT NULL DEFAULT 'unknown',
	`competition_mode` VARCHAR(16) NOT NULL DEFAULT 'unscored',
	`score_direction` VARCHAR(16) NOT NULL DEFAULT 'none',
	`result_status` VARCHAR(16) NOT NULL DEFAULT 'unknown',
	`tie_policy` VARCHAR(16) NOT NULL DEFAULT 'shared_win',
	`shared_score` NUMERIC(12, 3),
	`shared_score_status` VARCHAR(16) NOT NULL DEFAULT 'unrecorded',
	`end_reason` VARCHAR(16),
	`cooperative_result` VARCHAR(16),
	`rules_snapshot` JSON NOT NULL,
	`comparison_key` VARCHAR(64) COLLATE utf8mb4_bin,
	`game_snapshot` JSON NOT NULL,
	`activity_snapshot` JSON,
	`note` TEXT,
	`change_reason` VARCHAR(500),
	`created_by` INTEGER NOT NULL,
	`updated_by` INTEGER NOT NULL,
	`created_at` DATETIME(6) NOT NULL,
	`updated_at` DATETIME(6) NOT NULL,
	`revision` INTEGER NOT NULL DEFAULT 1,
	`round_count` INTEGER,
	`result_source` VARCHAR(24) NOT NULL DEFAULT 'unknown',
	`result_reason` VARCHAR(500),
	`tiebreak_applied` BOOL NOT NULL DEFAULT false,
	`exclusion_reason` VARCHAR(500),
	`timer_status` VARCHAR(16) NOT NULL DEFAULT 'idle',
	`timer_elapsed_seconds` BIGINT NOT NULL DEFAULT 0,
	`timer_resumed_at` DATETIME(6),
	`timer_stopped_at` DATETIME(6),
	PRIMARY KEY (`id`),
	CONSTRAINT `fk_play_game` FOREIGN KEY(`game_id`) REFERENCES `boardgames` (`id`),
	CONSTRAINT `fk_play_activity` FOREIGN KEY(`activity_id`) REFERENCES `activities` (`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_play_plan` FOREIGN KEY(`plan_id`) REFERENCES `activity_game_plans` (`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_play_inventory` FOREIGN KEY(`inventory_id`) REFERENCES `boardgame_inventory` (`id`),
	CONSTRAINT `fk_play_location` FOREIGN KEY(`location_id`) REFERENCES `boardgame_locations` (`id`),
	CONSTRAINT `ck_play_environment` CHECK (play_environment IN ('online','offline','unknown')),
	CONSTRAINT `ck_play_origin` CHECK (origin IN ('manual','bgg','bgstats')),
	CONSTRAINT `ck_play_publication` CHECK (publication_status IN ('published','held')),
	CONSTRAINT `ck_play_exclusion` CHECK (stats_exclusion IN ('none','wins','all')),
	CONSTRAINT `ck_play_status` CHECK (status IN ('draft','completed','abandoned','voided')),
	CONSTRAINT `ck_play_mode` CHECK (competition_mode IN ('unscored','individual','team','cooperative','solo')),
	CONSTRAINT `ck_play_direction` CHECK (score_direction IN ('high','low','manual','none')),
	CONSTRAINT `ck_play_result` CHECK (result_status IN ('unknown','resolved')),
	CONSTRAINT `ck_play_tie` CHECK (tie_policy IN ('shared_win','draw')),
	CONSTRAINT `ck_play_cooperative` CHECK (cooperative_result IS NULL OR cooperative_result IN ('success','failure')),
	CONSTRAINT `ck_play_duration` CHECK (duration_minutes IS NULL OR duration_minutes >= 1),
	CONSTRAINT `ck_play_date` CHECK (status NOT IN ('completed','abandoned') OR played_on IS NOT NULL),
	CONSTRAINT `bg9_creator` FOREIGN KEY(`created_by`) REFERENCES `users` (`id`),
	CONSTRAINT `bg9_updater` FOREIGN KEY(`updated_by`) REFERENCES `users` (`id`),
	CONSTRAINT `bg9_revision` CHECK (revision >= 1),
	CONSTRAINT `ck_play_shared_score_status` CHECK (shared_score_status IN ('unrecorded','recorded','gave_up','unfinished','table_flip')),
	CONSTRAINT `ck_play_shared_score_value` CHECK ((shared_score_status='recorded' AND shared_score IS NOT NULL) OR (shared_score_status<>'recorded' AND shared_score IS NULL)),
	CONSTRAINT `ck_play_end_reason` CHECK (end_reason IS NULL OR (status IN ('abandoned','voided') AND end_reason IN ('unfinished','table_flip'))),
	CONSTRAINT `ck_play_round_count` CHECK (round_count IS NULL OR round_count BETWEEN 1 AND 10000),
	CONSTRAINT `ck_play_result_source` CHECK (result_source IN ('unknown','score','manual_winner','manual_rank','tiebreak','source')),
	CONSTRAINT `ck_play_timer_status` CHECK (timer_status IN ('idle','running','paused','stopped')),
	CONSTRAINT `ck_play_timer_elapsed` CHECK (timer_elapsed_seconds BETWEEN 0 AND 6000000),
	CONSTRAINT `ck_play_timer_clock` CHECK ((timer_status='running' AND timer_resumed_at IS NOT NULL) OR (timer_status<>'running' AND timer_resumed_at IS NULL))
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE INDEX `ix_play_activity_history` ON `boardgame_plays` (`original_activity_id`, `played_on`, `status`);
CREATE INDEX `ix_play_author` ON `boardgame_plays` (`created_by`, `status`, `id`);
CREATE INDEX `ix_play_comparison` ON `boardgame_plays` (`comparison_key`, `status`);
CREATE INDEX `ix_play_environment` ON `boardgame_plays` (`play_environment`, `publication_status`, `status`, `played_on`);
CREATE INDEX `ix_play_game_date` ON `boardgame_plays` (`game_id`, `publication_status`, `status`, `played_on`);
CREATE INDEX `ix_play_location` ON `boardgame_plays` (`location_id`, `publication_status`, `status`, `played_on`);
CREATE INDEX `ix_play_origin` ON `boardgame_plays` (`origin`, `publication_status`);
CREATE INDEX `ix_play_public_date` ON `boardgame_plays` (`publication_status`, `status`, `played_on`, `id`);

CREATE TABLE `boardgame_play_expansions` (
	`play_id` INTEGER NOT NULL,
	`expansion_game_id` INTEGER NOT NULL,
	`inventory_id` INTEGER,
	`modules_note` VARCHAR(500),
	`compatibility_note` VARCHAR(500),
	`game_snapshot` JSON NOT NULL,
	`sort_order` INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY (`play_id`, `expansion_game_id`),
	CONSTRAINT `fk_playexp_play` FOREIGN KEY(`play_id`) REFERENCES `boardgame_plays` (`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_playexp_game` FOREIGN KEY(`expansion_game_id`) REFERENCES `boardgames` (`id`),
	CONSTRAINT `fk_playexp_inventory` FOREIGN KEY(`inventory_id`) REFERENCES `boardgame_inventory` (`id`)
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE INDEX `ix_playexp_game` ON `boardgame_play_expansions` (`expansion_game_id`, `play_id`);

CREATE TABLE `boardgame_play_observers` (
	`id` INTEGER NOT NULL AUTO_INCREMENT,
	`play_id` INTEGER NOT NULL,
	`person_id` INTEGER,
	`guest_key` VARCHAR(36),
	`display_name_snapshot` VARCHAR(64) NOT NULL,
	`observer_role` VARCHAR(16) NOT NULL,
	PRIMARY KEY (`id`),
	CONSTRAINT `fk_observer_play` FOREIGN KEY(`play_id`) REFERENCES `boardgame_plays` (`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_observer_person` FOREIGN KEY(`person_id`) REFERENCES `boardgame_people` (`id`),
	CONSTRAINT `uq_observer_person` UNIQUE (`play_id`, `person_id`),
	CONSTRAINT `uq_observer_guest` UNIQUE (`play_id`, `guest_key`),
	CONSTRAINT `ck_observer_role` CHECK (observer_role IN ('teacher','moderator')),
	CONSTRAINT `ck_observer_identity` CHECK ((person_id IS NOT NULL AND guest_key IS NULL) OR (person_id IS NULL AND guest_key IS NOT NULL))
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `boardgame_play_reports` (
	`id` INTEGER NOT NULL AUTO_INCREMENT,
	`play_id` INTEGER NOT NULL,
	`reported_by` INTEGER NOT NULL,
	`message` VARCHAR(1000) NOT NULL,
	`status` VARCHAR(16) NOT NULL DEFAULT 'open',
	`resolution` VARCHAR(1000),
	`resolved_by` INTEGER,
	`created_at` DATETIME(6) NOT NULL,
	`updated_at` DATETIME(6) NOT NULL,
	`revision` INTEGER NOT NULL DEFAULT 1,
	PRIMARY KEY (`id`),
	CONSTRAINT `fk_report_play` FOREIGN KEY(`play_id`) REFERENCES `boardgame_plays` (`id`),
	CONSTRAINT `fk_report_author` FOREIGN KEY(`reported_by`) REFERENCES `users` (`id`),
	CONSTRAINT `fk_report_resolver` FOREIGN KEY(`resolved_by`) REFERENCES `users` (`id`),
	CONSTRAINT `ck_report_status` CHECK (status IN ('open','resolved','dismissed')),
	CONSTRAINT `ck_report_revision` CHECK (revision >= 1)
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE INDEX `ix_report_author` ON `boardgame_play_reports` (`reported_by`, `created_at`);
CREATE INDEX `ix_report_status` ON `boardgame_play_reports` (`status`, `play_id`);

CREATE TABLE `boardgame_play_scoresheets` (
	`id` INTEGER NOT NULL AUTO_INCREMENT,
	`play_id` INTEGER NOT NULL,
	`source_item_id` INTEGER,
	`source_sheet_id` VARCHAR(128) COLLATE utf8mb4_bin,
	`schema_version` INTEGER NOT NULL DEFAULT 1,
	`template_key` VARCHAR(128) COLLATE utf8mb4_bin,
	`sheet_comparison_key` VARCHAR(64) COLLATE utf8mb4_bin,
	`parse_status` VARCHAR(16) NOT NULL DEFAULT 'partial',
	`display_data` JSON NOT NULL,
	`issues` JSON NOT NULL,
	`content_hash` VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
	`projection_version` INTEGER NOT NULL DEFAULT 1,
	`play_revision` INTEGER NOT NULL,
	`created_by` INTEGER NOT NULL,
	`updated_by` INTEGER NOT NULL,
	`created_at` DATETIME(6) NOT NULL,
	`updated_at` DATETIME(6) NOT NULL,
	`revision` INTEGER NOT NULL DEFAULT 1,
	PRIMARY KEY (`id`),
	CONSTRAINT `uq_sheet_play` UNIQUE (`play_id`),
	CONSTRAINT `uq_sheet_play_id` UNIQUE (`id`, `play_id`),
	CONSTRAINT `fk_sheet_play` FOREIGN KEY(`play_id`) REFERENCES `boardgame_plays` (`id`),
	CONSTRAINT `fk_sheet_source` FOREIGN KEY(`source_item_id`) REFERENCES `boardgame_import_items` (`id`),
	CONSTRAINT `fk_sheet_creator` FOREIGN KEY(`created_by`) REFERENCES `users` (`id`),
	CONSTRAINT `fk_sheet_updater` FOREIGN KEY(`updated_by`) REFERENCES `users` (`id`),
	CONSTRAINT `ck_sheet_state` CHECK (parse_status IN ('parsed','partial','unsupported')),
	CONSTRAINT `ck_sheet_versions` CHECK (schema_version >= 1 AND projection_version >= 1 AND play_revision >= 1 AND revision >= 1)
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE INDEX `ix_sheet_compare` ON `boardgame_play_scoresheets` (`sheet_comparison_key`, `parse_status`, `play_id`);

CREATE TABLE `boardgame_play_sources` (
	`id` INTEGER NOT NULL AUTO_INCREMENT,
	`play_id` INTEGER NOT NULL,
	`provider` VARCHAR(16) NOT NULL,
	`source_namespace` VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
	`source_play_id` VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
	`segment_index` INTEGER NOT NULL DEFAULT 1,
	`source_item_id` INTEGER NOT NULL,
	`content_hash` VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
	`source_modified_at` VARCHAR(64),
	`last_applied_play_revision` INTEGER NOT NULL,
	`mapping_snapshot` JSON NOT NULL,
	`created_at` DATETIME(6) NOT NULL,
	`updated_at` DATETIME(6) NOT NULL,
	PRIMARY KEY (`id`),
	CONSTRAINT `fk_play_source_play` FOREIGN KEY(`play_id`) REFERENCES `boardgame_plays` (`id`),
	CONSTRAINT `fk_play_source_item` FOREIGN KEY(`source_item_id`) REFERENCES `boardgame_import_items` (`id`),
	CONSTRAINT `uq_play_source_identity` UNIQUE (`provider`, `source_namespace`, `source_play_id`, `segment_index`),
	CONSTRAINT `ck_play_source_provider` CHECK (provider IN ('bgg','bgstats')),
	CONSTRAINT `ck_play_source_segment` CHECK (segment_index >= 1)
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE INDEX `ix_play_source_play` ON `boardgame_play_sources` (`play_id`);

CREATE TABLE `boardgame_play_tags` (
	`play_id` INTEGER NOT NULL,
	`tag_id` INTEGER NOT NULL,
	PRIMARY KEY (`play_id`, `tag_id`),
	CONSTRAINT `fk_play_tag_play` FOREIGN KEY(`play_id`) REFERENCES `boardgame_plays` (`id`),
	CONSTRAINT `fk_play_tag_tag` FOREIGN KEY(`tag_id`) REFERENCES `boardgame_tags` (`id`) ON DELETE CASCADE
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `boardgame_play_teams` (
	`id` INTEGER NOT NULL AUTO_INCREMENT,
	`play_id` INTEGER NOT NULL,
	`name` VARCHAR(64) NOT NULL,
	`score` NUMERIC(12, 3),
	`score_status` VARCHAR(16) NOT NULL DEFAULT 'unrecorded',
	`rank` INTEGER,
	`outcome` VARCHAR(16),
	`sort_order` INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY (`id`),
	CONSTRAINT `uq_team_play_id` UNIQUE (`play_id`, `id`),
	CONSTRAINT `fk_team_play` FOREIGN KEY(`play_id`) REFERENCES `boardgame_plays` (`id`) ON DELETE CASCADE,
	CONSTRAINT `ck_team_rank` CHECK (`rank` IS NULL OR `rank` >= 1),
	CONSTRAINT `ck_team_outcome` CHECK (outcome IS NULL OR outcome IN ('win','loss','draw')),
	CONSTRAINT `ck_team_score_status` CHECK (score_status IN ('unrecorded','recorded','gave_up','unfinished','table_flip')),
	CONSTRAINT `ck_team_score_value` CHECK ((score_status='recorded' AND score IS NOT NULL) OR (score_status<>'recorded' AND score IS NULL))
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `boardgame_play_players` (
	`id` INTEGER NOT NULL AUTO_INCREMENT,
	`play_id` INTEGER NOT NULL,
	`person_id` INTEGER,
	`guest_key` VARCHAR(36) COLLATE utf8mb4_bin,
	`display_name_snapshot` VARCHAR(64) NOT NULL,
	`avatar_snapshot` VARCHAR(1024),
	`team_id` INTEGER,
	`score` NUMERIC(12, 3),
	`score_status` VARCHAR(16) NOT NULL DEFAULT 'unrecorded',
	`rank` INTEGER,
	`outcome` VARCHAR(16),
	`seat_order` INTEGER NOT NULL,
	`is_start_player` BOOL NOT NULL DEFAULT false,
	`role_label` VARCHAR(100),
	`is_new_to_player` BOOL,
	`participant_kind` VARCHAR(16) NOT NULL DEFAULT 'human',
	PRIMARY KEY (`id`),
	CONSTRAINT `uq_player_play_id` UNIQUE (`play_id`, `id`),
	CONSTRAINT `fk_player_play` FOREIGN KEY(`play_id`) REFERENCES `boardgame_plays` (`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_player_person` FOREIGN KEY(`person_id`) REFERENCES `boardgame_people` (`id`),
	CONSTRAINT `fk_player_team` FOREIGN KEY(`play_id`, `team_id`) REFERENCES `boardgame_play_teams` (`play_id`, `id`),
	CONSTRAINT `uq_player_person` UNIQUE (`play_id`, `person_id`),
	CONSTRAINT `uq_player_guest` UNIQUE (`play_id`, `guest_key`),
	CONSTRAINT `uq_player_seat` UNIQUE (`play_id`, `seat_order`),
	CONSTRAINT `ck_player_identity` CHECK ((person_id IS NOT NULL AND guest_key IS NULL) OR (person_id IS NULL AND guest_key IS NOT NULL)),
	CONSTRAINT `ck_player_seat` CHECK (seat_order >= 1),
	CONSTRAINT `ck_player_rank` CHECK (`rank` IS NULL OR `rank` >= 1),
	CONSTRAINT `ck_player_outcome` CHECK (outcome IS NULL OR outcome IN ('win','loss','draw')),
	CONSTRAINT `ck_player_score_status` CHECK (score_status IN ('unrecorded','recorded','gave_up','unfinished','table_flip')),
	CONSTRAINT `ck_player_score_value` CHECK ((score_status='recorded' AND score IS NOT NULL) OR (score_status<>'recorded' AND score IS NULL)),
	CONSTRAINT `ck_player_kind` CHECK (participant_kind IN ('human','automa')),
	CONSTRAINT `ck_player_automa` CHECK (participant_kind='human' OR (person_id IS NULL AND guest_key IS NOT NULL))
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE INDEX `ix_player_person` ON `boardgame_play_players` (`person_id`, `play_id`);

CREATE TABLE `boardgame_scoresheet_cells` (
	`id` INTEGER NOT NULL AUTO_INCREMENT,
	`sheet_id` INTEGER NOT NULL,
	`play_id` INTEGER NOT NULL,
	`row_key` VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
	`group_key` VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
	`row_label` VARCHAR(255) NOT NULL,
	`row_order` INTEGER NOT NULL DEFAULT 0,
	`subject_kind` VARCHAR(16) NOT NULL,
	`subject_key` VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
	`player_id` INTEGER,
	`team_id` INTEGER,
	`value_number` NUMERIC(18, 6),
	`value_text` VARCHAR(1000),
	`is_aggregate` BOOL NOT NULL DEFAULT false,
	`projection_version` INTEGER NOT NULL,
	PRIMARY KEY (`id`),
	CONSTRAINT `uq_cell` UNIQUE (`sheet_id`, `row_key`, `subject_key`),
	CONSTRAINT `fk_cell_sheet` FOREIGN KEY(`sheet_id`, `play_id`) REFERENCES `boardgame_play_scoresheets` (`id`, `play_id`) ON DELETE CASCADE,
	CONSTRAINT `fk_cell_player` FOREIGN KEY(`play_id`, `player_id`) REFERENCES `boardgame_play_players` (`play_id`, `id`),
	CONSTRAINT `fk_cell_team` FOREIGN KEY(`play_id`, `team_id`) REFERENCES `boardgame_play_teams` (`play_id`, `id`),
	CONSTRAINT `ck_cell_subject` CHECK ((subject_kind='player' AND player_id IS NOT NULL AND team_id IS NULL AND subject_key=CONCAT('p:',player_id)) OR (subject_kind='team' AND player_id IS NULL AND team_id IS NOT NULL AND subject_key=CONCAT('t:',team_id)) OR (subject_kind='shared' AND player_id IS NULL AND team_id IS NULL AND subject_key='shared')),
	CONSTRAINT `ck_cell_projection` CHECK (projection_version >= 1)
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE INDEX `ix_cell_row` ON `boardgame_scoresheet_cells` (`sheet_id`, `row_key`, `is_aggregate`);
