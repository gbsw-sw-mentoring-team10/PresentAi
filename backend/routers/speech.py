import os
import subprocess
import tempfile

from fastapi import APIRouter, File, HTTPException, UploadFile
from services.stt_whisper import transcribe_audio
from services.silence_detect import detect_pauses
from services.speech_rate import get_speech_rate, get_speech_rate_score

router = APIRouter()

# Whisper STT, 무음 구간, 말하기 속도를 반환한다 (발음 평가는 /pronunciation/에서 한다)
@router.post("/")
def create_speech_feedback(file: UploadFile = File(...)):
    suffix = os.path.splitext(file.filename or "")[1] or ".wav"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp:
        temp.write(file.file.read())
        temp_path = temp.name

    try:
        result = transcribe_audio(temp_path)
        result["silence"] = detect_pauses(temp_path)
        result["speech_rate"] = get_speech_rate(result["text"], result["silence"])
        result["speech_rate_score"] = get_speech_rate_score(result["speech_rate"])
    except subprocess.CalledProcessError:
        raise HTTPException(status_code=400, detail="음성 파일을 읽을 수 없습니다.")
    finally:
        os.remove(temp_path)

    return result
