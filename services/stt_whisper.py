from transformers import pipeline


# 음성 파일 -> 텍스트 변환 함수 (호출할 때마다 모델을 로드한다)
def transcribe_audio(audio_path: str) -> dict:
    asr = pipeline(
        "automatic-speech-recognition",
        model="openai/whisper-small",
    )

    result = asr(
        audio_path,
        chunk_length_s=30,  # 30초가 넘는 음성은 나눠서 처리
        generate_kwargs={"language": "korean", "task": "transcribe"},
        return_timestamps=True
    )

    return result
