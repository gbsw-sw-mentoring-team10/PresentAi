-- scripts.migrate_feedback_json가 기존 결과를 백업·이관·검증한 뒤 단계별로 실행합니다.
-- 단독 실행하지 않습니다. --apply로 이관하고 서버 전환 후 --apply --drop-legacy로 삭제합니다.

-- ADD_COLUMN
ALTER TABLE slides_feedback_result ADD COLUMN feedback_result JSON NULL AFTER title;

-- DROP_LEGACY
DROP TABLE entire_improvements, slide_feedback, entire_result;
