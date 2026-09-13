CREATE TABLE `users` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `provider` varchar(30) NOT NULL DEFAULT 'LOCAL',
  `provider_user_id` varchar(100),
  `email` varchar(255) UNIQUE NOT NULL,
  `nickname` varchar(50) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
);

CREATE TABLE `places` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `external_source` varchar(30),
  `external_id` varchar(100),
  `name` varchar(150) NOT NULL,
  `address` varchar(255) NOT NULL,
  `category` varchar(50) NOT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `image_url` varchar(1000),
  `estimated_stay_minutes` int NOT NULL DEFAULT 60,
  `active` boolean NOT NULL DEFAULT true,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
);

CREATE TABLE `activities` (
  `code` varchar(30) PRIMARY KEY,
  `name` varchar(50) NOT NULL,
  `default_minutes` int NOT NULL DEFAULT 0,
  `display_order` int NOT NULL DEFAULT 0,
  `active` boolean NOT NULL DEFAULT true
);

CREATE TABLE `trips` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `title` varchar(100) NOT NULL,
  `travel_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `departure_name` varchar(150) NOT NULL,
  `departure_latitude` decimal(10,7),
  `departure_longitude` decimal(10,7),
  `status` ENUM ('DRAFT', 'SAVED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `saved_at` datetime,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
);

CREATE TABLE `trip_stops` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `trip_id` bigint NOT NULL,
  `place_id` bigint NOT NULL,
  `visit_order` int NOT NULL,
  `stay_minutes` int NOT NULL,
  `place_name_snapshot` varchar(150) NOT NULL,
  `address_snapshot` varchar(255),
  `latitude_snapshot` decimal(10,7) NOT NULL,
  `longitude_snapshot` decimal(10,7) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
);

CREATE TABLE `stop_activities` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `trip_stop_id` bigint NOT NULL,
  `activity_code` varchar(30) NOT NULL,
  `activity_name_snapshot` varchar(50) NOT NULL,
  `minutes` int NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL
);

CREATE TABLE `diagnoses` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `trip_id` bigint NOT NULL,
  `feasible` boolean NOT NULL,
  `available_minutes` int NOT NULL,
  `required_minutes` int NOT NULL,
  `remaining_minutes` int NOT NULL,
  `message` varchar(500) NOT NULL,
  `algorithm_version` varchar(30) NOT NULL DEFAULT '1.0',
  `created_at` datetime NOT NULL
);

CREATE TABLE `diagnosis_items` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `diagnosis_id` bigint NOT NULL,
  `trip_stop_id` bigint NOT NULL,
  `visit_order` int NOT NULL,
  `arrival_time` time NOT NULL,
  `departure_time` time NOT NULL,
  `travel_minutes_from_previous` int NOT NULL DEFAULT 0,
  `stay_minutes` int NOT NULL,
  `activity_minutes` int NOT NULL DEFAULT 0,
  `visitable` boolean NOT NULL DEFAULT true,
  `reason` varchar(300)
);

CREATE UNIQUE INDEX `users_index_0` ON `users` (`provider`, `provider_user_id`);

CREATE UNIQUE INDEX `places_index_1` ON `places` (`external_source`, `external_id`);

CREATE INDEX `places_index_2` ON `places` (`name`);

CREATE INDEX `places_index_3` ON `places` (`category`);

CREATE INDEX `places_index_4` ON `places` (`latitude`, `longitude`);

CREATE INDEX `trips_index_5` ON `trips` (`user_id`, `status`);

CREATE INDEX `trips_index_6` ON `trips` (`user_id`, `travel_date`);

CREATE UNIQUE INDEX `trip_stops_index_7` ON `trip_stops` (`trip_id`, `visit_order`);

CREATE UNIQUE INDEX `trip_stops_index_8` ON `trip_stops` (`trip_id`, `place_id`);

CREATE INDEX `trip_stops_index_9` ON `trip_stops` (`place_id`);

CREATE UNIQUE INDEX `stop_activities_index_10` ON `stop_activities` (`trip_stop_id`, `activity_code`);

CREATE INDEX `stop_activities_index_11` ON `stop_activities` (`activity_code`);

CREATE INDEX `diagnoses_index_12` ON `diagnoses` (`trip_id`, `created_at`);

CREATE UNIQUE INDEX `diagnosis_items_index_13` ON `diagnosis_items` (`diagnosis_id`, `visit_order`);

CREATE UNIQUE INDEX `diagnosis_items_index_14` ON `diagnosis_items` (`diagnosis_id`, `trip_stop_id`);

CREATE INDEX `diagnosis_items_index_15` ON `diagnosis_items` (`trip_stop_id`);

ALTER TABLE `trips` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `trip_stops` ADD FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON DELETE CASCADE;

ALTER TABLE `trip_stops` ADD FOREIGN KEY (`place_id`) REFERENCES `places` (`id`);

ALTER TABLE `stop_activities` ADD FOREIGN KEY (`trip_stop_id`) REFERENCES `trip_stops` (`id`) ON DELETE CASCADE;

ALTER TABLE `stop_activities` ADD FOREIGN KEY (`activity_code`) REFERENCES `activities` (`code`);

ALTER TABLE `diagnoses` ADD FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON DELETE CASCADE;

ALTER TABLE `diagnosis_items` ADD FOREIGN KEY (`diagnosis_id`) REFERENCES `diagnoses` (`id`) ON DELETE CASCADE;

ALTER TABLE `diagnosis_items` ADD FOREIGN KEY (`trip_stop_id`) REFERENCES `trip_stops` (`id`) ON DELETE CASCADE;
