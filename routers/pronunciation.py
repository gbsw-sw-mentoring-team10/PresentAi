import os
import subprocess
import tempfile

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from services.pronunciation_assess import assess_pronunciation
from services.stt_whisper import transcribe_audio
from services.silence_detect import detect_pauses
from services.speech_rate import get_speech_rate, get_speech_rate_score

router = APIRouter()

@router.post("/")
def create_pronunciation_feedback(reference_text: str | None = Form(None), file: UploadFile = File(...)):
    # 기준 문장(대본)이 있으면 그대로 사용하고, 없으면 Whisper로 받아 적은 텍스트를 기준 문장으로 쓴다
    reference_text = (reference_text or "").strip()

    suffix = os.path.splitext(file.filename or "")[1] or ".wav"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp:
        temp.write(file.file.read())
        temp_path = temp.name

    try:
        stt = transcribe_audio(temp_path)
        silence = detect_pauses(temp_path)
        reference_source = "user"
        if not reference_text:
            reference_text = stt["text"].strip()
            reference_source = "whisper"
        result = assess_pronunciation(temp_path, reference_text)
        result["reference_source"] = reference_source
        result["silence"] = silence
        result["speech_rate"] = get_speech_rate(stt["text"], silence)
        result["speech_rate_score"] = get_speech_rate_score(result["speech_rate"])
    except subprocess.CalledProcessError:
        raise HTTPException(status_code=400, detail="음성 파일을 읽을 수 없습니다.")
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    finally:
        os.remove(temp_path)

    return result
