import os
import subprocess
import tempfile

from fastapi import APIRouter, File, HTTPException, UploadFile

from services.speech_analysis import analyze_speech

router = APIRouter()

# Azure가 음성을 텍스트로 인식하고 발음까지 평가한다 (기준 문장은 필요 없다)
# 응답: text, chunks, silence, speech_rate, speech_rate_score와 pronunciation(점수·구간·단어별 결과)
@router.post("/")
def create_speech_feedback(file: UploadFile = File(...)):
    suffix = os.path.splitext(file.filename or "")[1] or ".wav"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp:
        temp.write(file.file.read())
        temp_path = temp.name

    try:
        return analyze_speech(temp_path)
    except subprocess.CalledProcessError:
        raise HTTPException(status_code=400, detail="음성 파일을 읽을 수 없습니다.")
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    finally:
        os.remove(temp_path)
