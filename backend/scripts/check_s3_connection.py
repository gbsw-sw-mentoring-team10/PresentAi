import argparse
from uuid import uuid4

import boto3
from botocore.exceptions import BotoCoreError, ClientError

import config
from services.file_storage import StorageNotConfigured, get_s3_client


def check_connection(client, bucket: str) -> None:
    key = f"presentai/connectivity-checks/{uuid4().hex}.txt"
    body = b"PresentAi S3 connection check\n"
    uploaded = False
    try:
        client.put_object(Bucket=bucket, Key=key, Body=body, ContentType="text/plain")
        uploaded = True
        result = client.get_object(Bucket=bucket, Key=key)
        with result["Body"] as stream:
            if stream.read(len(body) + 1) != body:
                raise ValueError("테스트 파일 내용이 일치하지 않습니다.")
        print("테스트 파일 업로드·조회 성공")
    finally:
        if uploaded:
            try:
                client.delete_object(Bucket=bucket, Key=key)
            except (BotoCoreError, ClientError):
                print(f"테스트 파일을 직접 정리해 주세요: s3://{bucket}/{key}")
                raise
            print("테스트 파일 정리 완료")


def main() -> int:
    parser = argparse.ArgumentParser(description="지정한 S3 버킷의 업로드·조회·삭제 권한 확인")
    parser.add_argument(
        "--write-test", action="store_true",
        help="작은 테스트 파일을 올리고 읽은 뒤 삭제합니다.",
    )
    parser.add_argument(
        "--expected-account-id", default="",
        help="먼저 로그인 계정이 지정한 AWS 계정인지 확인합니다.",
    )
    args = parser.parse_args()
    if not args.write_test:
        parser.print_help()
        return 0
    try:
        print(f"대상: {config.S3_BUCKET_NAME} / {config.S3_REGION}")
        if args.expected_account_id:
            identity = boto3.Session().client(
                "sts", region_name=config.S3_REGION
            ).get_caller_identity()
            if identity["Account"] != args.expected_account_id:
                print(
                    f"현재 로그인 계정이 지정한 계정 {args.expected_account_id}과 다릅니다. "
                    "aws login --profile presentai를 다시 실행하고 해당 계정을 선택해 주세요."
                )
                return 1
        check_connection(get_s3_client(), config.S3_BUCKET_NAME)
    except StorageNotConfigured as exc:
        print(str(exc))
        return 1
    except (BotoCoreError, ClientError) as exc:
        code = (
            exc.response.get("Error", {}).get("Code", "")
            if isinstance(exc, ClientError) else type(exc).__name__
        )
        print(f"S3 연결 실패 ({code}). AWS 로그인 상태·리전·버킷 접근 권한을 확인해 주세요.")
        return 1
    print("S3 연결 검증 완료")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
