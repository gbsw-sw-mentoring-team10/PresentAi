ALTER TABLE slide_feedback
    DROP PRIMARY KEY,
    ADD PRIMARY KEY (slides_result_id, slide_number);
