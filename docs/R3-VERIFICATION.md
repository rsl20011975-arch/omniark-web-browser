# R3 실제 검증 기록 — 2026-10-19 KST

## 결과와 범위

실제 Chromium 탭 옆 native sidePanel, 같은 대화의 전체 화면 전환,
실제 공식 Codex 및 Claude 구독 추론과 MCP 브라우저/파일 연결을 구현했다.
독립적인 Chromium 소스 빌드나 Aside 90% 합격을 의미하지 않는다.
기능 50개 중 20개에 부분 구현·검증 증거가 있으나, 각 항목의 전체 조건을
충족하지 않아 완전 합격은 0/50, 가중 점수는 0/98로 기록한다.
세부 기준을 잘게 쪼개 분모를 바꾸거나 부분 구현에 합격 점수를 주지 않는다.

## 실제 실행에서 통과한 것

| 검사 | 확인한 실물 | 증거 파일 (프로젝트 기준) |
|---|---|---|
| Native chat | 실제 sidePanel target→별도 실제 탭→10행 CSV→대기열 후속 수정 | evidence/r2/native.json |
| 대화 전환 | 전체 채팅 새 탭에서 같은 대화·파일, 패널과 초안 동기화 | evidence/r2/native-full-chat.png |
| 자료 비교 | PDF/DOCX/XLSX 업로드·읽기, DOCX/XLSX/웹 수량 10행 모두 일치 | evidence/r2/document-chat.json |
| 외부 Codex | 공식 CLI→MCP→실제 웹 탐색·CSV 읽기·새 파일 저장 | evidence/r2/external-codex.json |
| 외부 Claude | API 키를 제외하고 claude.ai Pro 확인→MCP 웹 탐색·파일 저장/재읽기 | evidence/r2/external-claude.json |
| 채팅 AI 전환 | Claude로 웹→파일 작성, 같은 대화에서 Codex로 원문 유지 수정 | evidence/r2/provider-switch.json |
| 실행 중 변경 | 이전 모델 응답 폐기 후 NEW 저장, OLD 미저장 | evidence/r2/workflow-controls.json |
| 승인 | 승인 이전 파일 없음, 정확한 요청 승인 이후 실물 존재 | evidence/r2/workflow-controls.json |
| 문서 근거 | 실제 원본 3종 SHA256과 기록 일치, 추출 경고 보존 | tests/documents/read.ts |
| 회귀 | 파일 충돌·경로 경계·승인·큐·완료 판정·프로필 소유권·근거 9/9 | npm test |

위 검사는 각기 격리된 테스트 프로필/데이터에서 실행했다.
300회/3일의 신뢰도 시험, 외부 서비스의 상업적 발행 시험과 같지 않다.
스크린샷(native-panel/full-chat, document-chat, native-status, provider-switch)을
직접 열어 검수했다. 사용자 입력이나 키 값을 테스트 증거에 저장하지 않는다.

## 검사 중 발견하고 고친 원인

1. Extension 헤더·서비스워커 초기화·탭 로딩 상태 오류: 실제 상태에 맞게 수정.
2. 관리 화면 탭이 작업 대상으로 선택됨: 관리 origin을 관찰/클릭/탐색 대상으로 제외.
3. Claude schema 규격 불일치: 공식 설치 CLI가 받는 draft-7으로 변환.
4. 접수 직후 작업 표시 공백: 응답 후 실제 상태를 갱신하고 실행 여부 표시.
5. 웹 관리 화면에서 native 탭을 빈 브라우저로 표시: 실제 연결 방식과 제목 표시.
6. 자료 파일만 읽은 작업에서 웹 관찰만 근거로 남음: 문서 해시·추출 경고 별도 기록.

## 설치와 활성 버전

프로젝트: C:\Users\user\Documents\Codex\2026-10-18\new-chat\work\local-browser

- Start-Native-Browser.cmd → start-native.ps1 → 19374, profiles/r2.
- native-runtime은 해당 사용자 창의 확장 디렉터리다.
- 현재 이미 실행 중인 19374 서버는 이전 R2 코드다. 소스 파일 변경만으로
  백엔드나 로드된 확장이 갱신되지 않는다. 최신 R3 검사는 19376의 별도 테스트
  서버에서 완료했으며 테스트 종료 시 정상 종료했다.
- 기존 서버/사용자 브라우저를 종료하지 않았다. 사용자의 전역 규칙상 PID 지정
  재시작 승인이 필요하여 질문을 남긴 상태다. 승인 전 최신 버전 활성화를 주장하지 않는다.
- 공유 Flow 프로필 profiles/p0, profiles/diagnostic과 다른 공장 프로세스는 건드리지 않았다.

## 고정 90% 게이트와 남은 작업

정식 목록: acceptance/features.csv. 최소 45/50, 89/98, 필수 E01–E10,
100개 시나리오×3회, 3일/9세션, 자동완료율 90% 및 그룹별 85%가 필요하다.
현재 E03/E04의 호환 런타임 경로는 통과했고 E01/E02/E06은 부분 증거만 있다.
E05/E07/E08/E09/E10은 합격하지 않았다. 최종 소스 빌드 재검증도 남아 있다.

외부 입력이 필요한 것:

- Chromium Windows 소스 빌드: 공식 최소 여유 100GB인 경로. 현재 C/D/E/F 모두 미달.
- 실행 중인 이 프로젝트 서버/브라우저만 PID 확인 후 재시작할 승인.
- 실제 로그인 페이지, Flow 생성, Sheets 및 세금계산서 발행은 실제 계정·업무 상태에서 검증 필요.
- Antigravity/Copilot 공식 연결이 아직 준비되지 않았다.

계속 구현해야 할 주요 기능 (위 입력과 별개):

- 안전한 재시작·미확인 제출 대조·작업 이어하기, 배경 탭과 명확한 사람 인계.
- iframe/팝업/다운로드·가상 목록/페이지 순회·OCR·주장별 근거 연결.
- 금고/Passkey/MFA/OS 격리·업데이트·백업, 제공자/사용량·장기 맥락 관리.
- 스킬/MCP 클라이언트·루틴/이벤트·프로젝트/기억·외부 채널 등 나머지 고정 목록.

봇 감지 회피·모든 사이트 접근·Flow 생성 성공을 보장하거나 검증했다고 말할 수 없다.
사용자가 읽을 수 있는 렌더된 페이지를 현재 로그인 세션에서 읽는 경로를 제공하며,
차단·인증·불확실한 제출은 중단·사람 확인으로 남긴다.
