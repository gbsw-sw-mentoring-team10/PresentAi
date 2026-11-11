# Azure 백엔드 담당자용 S3 연결

현재 프런트의 `front/vercel.json`은 `/api/presentation/*`를
`http://20.249.208.145:8000/*`로 전달합니다. S3 인증을 적용할 대상은 이 요청을
처리하는 Azure 백엔드 프로세스입니다. Vercel 배포와 Azure 백엔드 배포는 별개입니다.

버킷은 `gbsw10presentai-storage`, 리전은 `ap-southeast-2`입니다.
프런트 이용자는 AWS 인증 없이 서비스 로그인으로 파일을 올리고 내려받습니다.

## 1. AWS 담당자가 서버용 권한 준비

기존 서버용 역할 인증이 있으면 그 방식을 사용합니다. AWS 외부 서버도
역할과 임시 인증을 사용할 수 있으며, AWS는 이 방식을 우선 권장합니다.
[AWS 워크로드 인증 안내](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#use-roles-for-applications)

역할 인증을 사용할 수 없어 액세스 키 방식으로 연결한다면, 서버 전용 IAM 사용자에
다음 객체 권한만 부여합니다. 이 문서는 실제 사용자·정책·키를 생성하지 않습니다.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::gbsw10presentai-storage/presentai/*"
    }
  ]
}
```

이 범위에는 실제 원본과 연결 확인용 임시 파일 경로가 포함됩니다.
버킷을 공개하거나 S3 전체 관리자 권한을 부여할 필요는 없습니다.
별도 버킷 차단 정책이나 SSE-KMS 설정이 있다면 그 정책도 확인합니다.

AWS 담당자가 준비한 서버용 키는 Azure 담당자가 비밀 설정에 직접 등록합니다.
소스, GitHub 커밋, 프런트의 `VITE_*` 설정, 채팅 답변에 키를 넣지 않습니다.
로컬 컴퓨터의 `~/.aws` 로그인 캐시나 root 계정 정보도 전달하지 않습니다.

## 2. Azure 담당자가 백엔드 실행 환경에 설정

액세스 키 방식이면 다음 네 변수를 **실제 백엔드 프로세스의 환경**에 설정합니다.
아래 키 값은 설명용 자리표시자이며 실제 값으로 입력해야 합니다.
기존 DB·AI 키·로그인·CORS 설정은 유지합니다.

```dotenv
S3_BUCKET_NAME=gbsw10presentai-storage
AWS_DEFAULT_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=서버용_액세스키
AWS_SECRET_ACCESS_KEY=서버용_비밀키
```

키 방식에서는 로컬 전용 `AWS_PROFILE=presentai`를 서버의 `.env`와 실행 환경에서
제거합니다. 과거 임시 로그인에서 남은 `AWS_SESSION_TOKEN`도 키 방식과 섞지 않습니다.
역할·임시 인증을 사용하는 경우에는 해당 인증 공급자의 설정을 따릅니다.

- **Azure VM:** 실행 중인 서비스의 환경변수나 배포된 프로젝트의 `backend/.env`에
  등록합니다. 이 백엔드는 시작할 때 그 `.env`를 읽으며, 이미 설정된 프로세스
  환경변수가 우선합니다. Docker를 쓴다면 컨테이너 안의 백엔드에도 변수를 전달합니다.
- **Azure App Service:** Azure 포털 → App Services → 해당 백엔드 → Settings →
  Environment variables → App settings에 등록하고 Apply 합니다. 설정 변경은 앱을
  재시작합니다. [Microsoft 공식 안내](https://learn.microsoft.com/en-us/azure/app-service/configure-common?tabs=portal#configure-app-settings)

실제 Azure 리소스 종류와 서비스 이름은 서버 담당자가 확인해야 합니다.
터미널에서만 일시적으로 설정하고 서비스에는 반영하지 않는 경우를 주의합니다.

## 3. Azure에 최신 백엔드 배포

`b1950df` 커밋 또는 이를 포함하는 최신 `main`을 Azure에도 배포합니다.
이 커밋은 로그인한 사용자의 업로드 원본을 S3에 저장하고 피드백 기록에 연결합니다.
Vercel에서 프런트 배포가 끝나더라도 Azure 코드가 바뀌었는지는 별도로 확인합니다.

서버 저장소를 직접 관리하는 VM이라면 저장소 루트에서 다음 명령으로 갱신합니다.
충돌이나 로컬 수정으로 갱신이 거절되면 그 상태에서 중단하고 담당자에게 확인합니다.

```sh
git pull --ff-only origin main
```

CI나 App Service 배포를 사용한다면 기존 배포 절차로 같은 코드를 적용합니다.
그다음 **배포 백엔드가 사용하는 Python 가상환경을 활성화**하고 `backend` 폴더에서
다음 명령을 실행합니다.

```sh
python -m pip install -r requirements.txt
python -m scripts.init_file_storage
python -m scripts.init_file_storage --apply
python -m scripts.check_s3_connection --write-test
```

`init_file_storage --apply`는 누락된 파일 연결 컬럼만 추가하고 이미 있으면 건너뜁니다.
같은 MySQL DB를 사용한다면 이미 적용되어 있습니다. 기존 피드백과 테이블을 삭제하지
않으며 `db/schema.sql` 전체를 기존 DB에 다시 실행하지 않습니다.

연결 검사는 작은 테스트 객체 하나를 업로드·조회·삭제합니다.
`S3 연결 검증 완료`가 나와야 합니다. IAM 키 방식에서는 `aws login`이 필요하지 않습니다.
테스트 명령도 위 네 환경변수를 읽는 환경에서 실행해야 합니다.

배포 방식에 맞게 실제 백엔드 서비스·컨테이너를 재시작합니다. 서비스 이름을
모르므로 임의의 `systemctl`, `docker`, 프로세스 종료 명령은 제공하지 않습니다.

## 4. Vercel 사이트에서 최종 확인

1. 서비스 계정으로 로그인하고 작은 발표자료 파일 하나를 실제 분석합니다.
2. 결과 화면에 원본 저장 완료가 표시되는지 확인합니다.
3. ‘내 피드백’에서 같은 기록을 다시 열고 ‘원본 자료 받기’로 다운로드합니다.
4. 받은 파일이 업로드한 원본과 같은지 확인합니다.

명령의 연결 검사만 성공하고 사이트에서는 실패한다면 실제 서비스 프로세스에
환경변수가 전달됐는지, 최신 백엔드를 실행 중인지 먼저 확인합니다.
`GET /health`는 피드백 JSON 구조를 확인하는 API이며 S3 연결 성공을 증명하지 않습니다.

담당자는 적용한 커밋 번호와 비밀 값이 없는 검사 결과만 공유하면 됩니다.
다운로드용 임시 서명 URL과 실제 액세스 키는 공유하지 않습니다.

현재 이 저장소의 로컬 S3 검증과 코드 반영은 완료되었으나,
Azure 서버의 인증 등록·재시작·사이트 최종 검증은 서버 담당자가 수행해야 합니다.
