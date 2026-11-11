-- PresentAI: 현재 MySQL 테이블 구조
-- backend 폴더에서 python -m scripts.export_db_schema 명령으로 갱신합니다.
-- 데이터, DB 접속 정보, 계정 비밀번호는 포함하지 않습니다.
-- 새 빈 DB를 선택한 뒤 전체를 실행합니다. 기존 DB 변경용 파일이 아닙니다.
-- 기존 DB의 구조 변경 내역은 db/migrations/에서 관리합니다.

SET NAMES utf8mb4;

CREATE TABLE `users` (
  `user_id` bigint NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `auth_sessions` (
  `token_hash` binary(32) NOT NULL,
  `user_id` bigint NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `expires_at` datetime(6) NOT NULL,
  PRIMARY KEY (`token_hash`),
  KEY `idx_auth_sessions_user` (`user_id`),
  KEY `idx_auth_sessions_expiry` (`expires_at`),
  CONSTRAINT `fk_auth_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `input_files` (
  `file_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `s3_key` varchar(700) NOT NULL,
  `file_size` bigint NOT NULL,
  `content_type` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`file_id`),
  UNIQUE KEY `uk_input_files_s3_key` (`s3_key`),
  KEY `fk_input_files_user` (`user_id`),
  CONSTRAINT `fk_input_files_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `slides_feedback_result` (
  `slides_result_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `title` text NOT NULL,
  `feedback_result` json DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `error_message` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `input_file_id` bigint DEFAULT NULL,
  `file_storage_status` varchar(20) DEFAULT NULL,
  `file_storage_message` text,
  PRIMARY KEY (`slides_result_id`),
  KEY `fk_slices_feedback_result_user` (`user_id`),
  KEY `fk_feedback_input_file` (`input_file_id`),
  CONSTRAINT `fk_feedback_input_file` FOREIGN KEY (`input_file_id`) REFERENCES `input_files` (`file_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_slices_feedback_result_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
