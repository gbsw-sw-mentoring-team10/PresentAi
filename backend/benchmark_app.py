"""Whisper 속도 측정용 별도 앱. 운영 앱(main.py)에는 포함되지 않는다.

서버에서 로컬로만 열어 쓴다:
    uvicorn benchmark_app:app --host 127.0.0.1 --port 8001
    curl -F file=@clip.wav -F engine=faster localhost:8001/whisper
"""
import os
import tempfile
import threading
from typing import Literal

from fastapi import FastAPI, File, Form, HTTPException, UploadFile

from services import whisper_benchmark as bench

app = FastAPI(title="Whisper benchmark")
_busy = threading.Lock()  # 측정이 서로 겹치면 시간이 왜곡되므로 한 번에 하나만 실행한다


@app.get("/")
def info():
    return {"endpoints": ["POST /whisper", "POST /pipeline/original"], "engines": ["faster", "transformers"]}


@app.post("/whisper")
def whisper(
    file: UploadFile = File(...),
    engine: Literal["faster", "transformers"] = Form(...),
    # faster-whisper 설정
    beam_size: int = Form(1, ge=1, le=10),
    compute_type: Literal["int8", "float32"] = Form("int8"),
    vad_filter: bool = Form(False),
    # transformers 설정 (기본값은 이전 구현과 같다)
    chunk_length_s: int = Form(30, ge=5, le=30),
    stride_s: int = Form(5, ge=0, le=15),
    num_beams: int = Form(1, ge=1, le=10),
    dtype: Literal["float32", "bfloat16"] = Form("float32"),
    int8: bool = Form(False),
    timestamps: bool = Form(True),
    batch_size: int = Form(1, ge=1, le=16),
    include_text: bool = Form(True),
):
    if not _busy.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="다른 측정이 진행 중입니다. 끝난 뒤 다시 시도해 주세요.")
    suffix = os.path.splitext(file.filename or "")[1] or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp:
        temp.write(file.file.read())
        source = temp.name
    wav_path = None
    try:
        wav_path, duration = bench.prepare(source)
        if engine == "faster":
            result = bench.run_faster(
                wav_path, duration, beam_size=beam_size, compute_type=compute_type, vad_filter=vad_filter
            )
        else:
            result = bench.run_transformers(
                wav_path, duration, chunk_length_s=chunk_length_s, stride_s=stride_s, num_beams=num_beams,
                dtype=dtype, int8=int8, timestamps=timestamps, batch_size=batch_size,
            )
    except ModuleNotFoundError as exc:
        raise HTTPException(status_code=503, detail=f"필요한 패키지가 설치돼 있지 않습니다: {exc.name}")
    finally:
        os.remove(source)
        if wav_path:
            bench.cleanup(wav_path)
        _busy.release()
    if not include_text:
        result.pop("text")
    return result


# 이전 구현 그대로 측정: Whisper(transformers) → Azure 통째 전송. 단계별 시간과 합계를 돌려준다
@app.post("/pipeline/original")
def original_pipeline(
    file: UploadFile = File(...),
    whisper: Literal["transformers", "faster"] = Form("transformers"),
):
    if not _busy.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="다른 측정이 진행 중입니다. 끝난 뒤 다시 시도해 주세요.")
    suffix = os.path.splitext(file.filename or "")[1] or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp:
        temp.write(file.file.read())
        source = temp.name
    try:
        return bench.run_original_pipeline(source, whisper=whisper)
    except ModuleNotFoundError as exc:
        raise HTTPException(status_code=503, detail=f"필요한 패키지가 설치돼 있지 않습니다: {exc.name}")
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    finally:
        os.remove(source)
        _busy.release()
