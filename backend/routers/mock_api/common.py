import json
import logging
import time
from pathlib import Path

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent / "data"


def load_samples(name: str) -> list[dict]:
    """data/<name>.json에서 mock 샘플 목록을 읽는다."""
    with (DATA_DIR / f"{name}.json").open(encoding="utf-8") as file:
        return json.load(file)


def simulate_latency(seconds: float, message: str) -> None:
    """실제 AI 처리 시간을 흉내 낸다. 테스트에서는 이 함수를 대체해 대기를 없앤다."""
    logger.info("%s (%.0f초 대기)", message, seconds)
    time.sleep(seconds)
