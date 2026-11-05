import os
import subprocess
import tempfile

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from services.pronunciation_assess import assess_pronunciation

router = APIRouter()

# 기준 문장(reference_text)과 비교해 발음을 평가한다 (기준 문장은 /speech/ 응답의 text를 그대로 보내면 된다)
@router.post("/")
def create_pronunciation_feedback(reference_text: str = Form(...), file: UploadFile = File(...)):
    reference_text = reference_text.strip()
    if not reference_text:
        raise HTTPException(status_code=400, detail="기준 문장(reference_text)을 입력해야 합니다.")

    suffix = os.path.splitext(file.filename or "")[1] or ".wav"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp:
        temp.write(file.file.read())
        temp_path = temp.name

    try:
        result = assess_pronunciation(temp_path, reference_text)
    except subprocess.CalledProcessError:
        raise HTTPException(status_code=400, detail="음성 파일을 읽을 수 없습니다.")
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    finally:
        os.remove(temp_path)

    return result
