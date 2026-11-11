-- 기존 피드백 JSON과 기록은 유지하고 원본 파일 연결 정보만 추가합니다.
ALTER TABLE slides_feedback_result
    ADD COLUMN input_file_id BIGINT NULL,
    ADD COLUMN file_storage_status VARCHAR(20) NULL,
    ADD COLUMN file_storage_message TEXT NULL,
    ADD CONSTRAINT fk_feedback_input_file FOREIGN KEY (input_file_id)
        REFERENCES input_files (file_id) ON DELETE SET NULL;
