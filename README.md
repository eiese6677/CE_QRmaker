# QR 공유 확장앱

현재 페이지의 URL을 QR 코드로 쉽게 공유할 수 있는 Chrome 확장 프로그램입니다.

## 🚀 기능

- **QR 코드 생성**: 현재 페이지의 URL을 QR 코드로 변환
- **다운로드**: QR 코드 이미지를 PNG 형태로 다운로드
- **요소 선택기**: 웹페이지 요소를 시각적으로 선택하고 코드 추출
- **코드 생성**: CSS 선택자, HTML, JavaScript 코드 자동 생성
- **실시간 편집**: 선택한 요소의 속성을 실시간으로 수정
- **미리보기**: 변경사항을 즉시 확인

## 📦 설치 방법

1. 이 저장소를 클론하거나 다운로드합니다:
```bash
git clone https://github.com/eiese6677/CE_QRmaker.git
```

2. Chrome 브라우저에서 `chrome://extensions/`로 이동
3. 우상단의 "개발자 모드"를 활성화
4. "압축해제된 확장 프로그램을 로드합니다" 클릭
5. 다운로드한 폴더를 선택

## 🔧 사용 방법

### QR 코드 생성
1. 공유하고 싶은 웹페이지로 이동
2. 확장 프로그램 아이콘 클릭
3. 팝업에서 생성된 QR 코드 확인
4. "다운로드" 버튼으로 이미지 저장

### 요소 선택기
1. 확장 프로그램 팝업에서 "요소 선택" 클릭
2. 웹페이지에서 원하는 요소에 마우스 오버
3. 요소 클릭하여 선택
4. HTML, CSS, JavaScript 코드 자동 생성
5. 각 코드를 개별 복사하거나 "전체 복사" 사용

### 실시간 편집
- "변수 편집" 버튼으로 선택한 요소의 속성 수정
- ID, Class, 텍스트 내용 실시간 변경
- CSS 속성 추가/수정 (컬러 피커 포함)
- 변경사항 적용, 초기화, 되돌리기 기능

## 📁 파일 구조

```
CE_QRmaker/
├── manifest.json      # 확장 프로그램 설정
├── popup.html         # 팝업 UI
├── popup.js           # 팝업 동작 로직
├── background.js      # 백그라운드 스크립트
├── selector.js        # 요소 선택기 스크립트
├── qr.html           # QR 코드 표시 페이지
├── qrcode.min.js     # QR 코드 생성 라이브러리
└── icon*.png         # 확장 프로그램 아이콘들
```

## 🛠️ 주요 기술

- **Manifest V3**: 최신 Chrome 확장 프로그램 표준
- **QRCode.js**: QR 코드 생성 라이브러리
- **Chrome Extensions API**: tabs, scripting 권한 활용
- **Vanilla JavaScript**: 라이브러리 의존성 최소화

## 🔐 권한 설명

- `tabs`: 현재 탭의 URL 접근
- `activeTab`: 활성 탭에 대한 접근
- `scripting`: 요소 선택기 스크립트 주입

## 🤝 기여하기

버그 리포트나 기능 제안은 [Issues](https://github.com/eiese6677/CE_QRmaker/issues)에서 등록해 주세요.

## 📄 라이선스

MIT License

---

**개발자**: [eiese6677](https://github.com/eiese6677)  
**버전**: 1.0
