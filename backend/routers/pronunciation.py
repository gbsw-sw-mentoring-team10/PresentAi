import json
import logging
import os
import subprocess
import tempfile

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from services.pronunciation_assess import assess_pronunciation

router = APIRouter()
logger = logging.getLogger(__name__)


# chunks는 /speech/ 응답의 chunks를 JSON 문자열로 보낸 것이다. 형식이 틀리면 무시하고 통째로 평가한다
def parse_chunks(raw: str | None) -> list[dict] | None:
    if not raw:
        return None
    try:
        items = json.loads(raw)
        chunks = [
            {"start": float(item["timestamp"][0]), "end": float(item["timestamp"][1]), "text": str(item["text"])}
            for item in items
        ]
    except (ValueError, TypeError, KeyError, IndexError):
        logger.warning("chunks 형식이 올바르지 않아 구간 분할 없이 평가합니다.")
        return None
    return chunks if all(c["end"] >= c["start"] for c in chunks) else None

# 기준 문장(reference_text)과 비교해 발음을 평가한다 (기준 문장은 /speech/ 응답의 text를 그대로 보내면 된다)
@router.post("/")
def create_pronunciation_feedback(
    reference_text: str = Form(...),
    chunks: str | None = Form(None),
    file: UploadFile = File(...),
):
    reference_text = reference_text.strip()
    if not reference_text:
        raise HTTPException(status_code=400, detail="기준 문장(reference_text)을 입력해야 합니다.")

    suffix = os.path.splitext(file.filename or "")[1] or ".wav"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp:
        temp.write(file.file.read())
        temp_path = temp.name

    try:
        result = assess_pronunciation(temp_path, reference_text, chunks=parse_chunks(chunks))
    except subprocess.CalledProcessError:
        raise HTTPException(status_code=400, detail="음성 파일을 읽을 수 없습니다.")
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    finally:
        os.remove(temp_path)

    return result
