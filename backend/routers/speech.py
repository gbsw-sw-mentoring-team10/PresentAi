import os
import subprocess
import tempfile

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from services.speech_analysis import analyze_speech, analyze_speech_accurate

router = APIRouter()

ANALYZERS = {"accurate": analyze_speech_accurate, "fast": analyze_speech}


# 음성을 텍스트로 인식하고 발음까지 평가한다. mode로 분석 방식을 고른다
# - accurate(기본): Whisper가 받아 적고 Azure가 발음을 평가한다. 정확하지만 오래 걸린다
# - fast: Azure가 인식과 발음 평가를 한 번에 한다. 빠르지만 영어가 섞이거나 노래·소음이 있으면 받아 적기가 부정확할 수 있다
# 응답: text, chunks, silence, speech_rate, speech_rate_score와 pronunciation(점수·구간·단어별 결과)
@router.post("/")
def create_speech_feedback(file: UploadFile = File(...), mode: str = Form("accurate")):
    analyze = ANALYZERS.get(mode)
    if analyze is None:
        raise HTTPException(status_code=400, detail="mode는 accurate 또는 fast여야 합니다.")
    suffix = os.path.splitext(file.filename or "")[1] or ".wav"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp:
        temp.write(file.file.read())
        temp_path = temp.name

    try:
        return analyze(temp_path)
    except subprocess.CalledProcessError:
        raise HTTPException(status_code=400, detail="음성 파일을 읽을 수 없습니다.")
    except ModuleNotFoundError:
        raise HTTPException(status_code=503, detail="이 서버에서는 정확한 분석을 사용할 수 없습니다. 빠른 분석을 선택해 주세요.")
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    finally:
        os.remove(temp_path)
