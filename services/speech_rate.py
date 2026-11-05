from fastapi import HTTPException
import re

def get_text_length(text: str):
    cleaned_text = re.sub(r'[^a-zA-Z0-9가-힣]', '', text)
    return len(cleaned_text)

def get_total_pauses(duration_info):
    total_pauses = 0
    for p in duration_info["pauses"]:
        total_pauses += p["duration"]
    return total_pauses

def get_speech_rate(text, duration_info):
    if duration_info["pauses"] == []:
        result = round(60 * (get_text_length(text) / duration_info["duration"]), 1)
        return result
    result = round(60 * (get_text_length(text) / (duration_info["duration"] - get_total_pauses(duration_info))), 1)
    return result

TARGET_SPEECH_RATE = 325

def get_speech_rate_score(speech_rate, target=TARGET_SPEECH_RATE):
    """목표 속도(분당 글자 수)에 가까울수록 100점, 오차 비율만큼 감점 (0~100)."""
    deviation = abs(speech_rate - target) / target
    return round(max(0.0, 100 * (1 - deviation)), 1)
