# ⛳ 골프 핸디캡 계산기

골프 핸디캡을 자동으로 계산해주는 웹 애플리케이션입니다.

## 주요 기능

### 1. ⚙️ 핸디캡 설정
- 핸디캡 비율 설정 (70% ~ 100%)
- 반올림 방식 선택 (반올림 / 올림 / 버림)

### 2. 👤 선수 관리
- 선수 등록 (이름, 나이, 부서, G핸디, 평균타수)
- 일자별 G핸디/평균타수 기록 관리
- 기록 변화 그래프 (Recharts)

### 3. 🧮 핸디캡 계산
- 최대 8명까지 선수 선택 (콤보박스)
- G핸디 기준: (높은사람 - 낮은사람) × 비율 → 반올림/올림/버림
- 결과를 표로 표시

### 4. 🏆 경기 결과
- 경기 결과 입력 → 핸디캡 적용 순위 계산
- 경기 히스토리 관리

## 기술 스택

| 구분 | 기술 | 호스팅 |
|------|------|--------|
| Frontend | React 18 + TypeScript + Vite | Vercel |
| Backend | Node.js + Express + TypeORM | AWS Lightsail + PM2 |
| Database | Microsoft SQL Server | AWS Lightsail (포트 10533) |
| Push | Web Push (VAPID) | Service Worker |

## 프로젝트 구조

```
Golf_Handicap_Calc/
├── frontend/               # React + Vite 프론트엔드
│   ├── src/
│   │   ├── pages/          # 페이지 컴포넌트
│   │   │   ├── SettingsPage.tsx      # 핸디캡 설정
│   │   │   ├── PlayersPage.tsx       # 선수 관리
│   │   │   ├── HandicapCalcPage.tsx  # 핸디캡 계산
│   │   │   └── GameResultsPage.tsx   # 경기 결과
│   │   ├── components/     # 공통 컴포넌트
│   │   ├── App.tsx
│   │   ├── api.ts          # API 호출
│   │   ├── types.ts        # TypeScript 타입
│   │   └── index.css       # 스타일
│   └── package.json
├── backend/                # Express + TypeORM 백엔드
│   ├── src/
│   │   ├── entities/       # TypeORM 엔티티
│   │   ├── routes/         # API 라우트
│   │   ├── data-source.ts  # DB 연결 설정
│   │   └── index.ts        # 서버 진입점
│   └── package.json
└── README.md
```

## 개발 환경 설정

### 1. 프론트엔드
```bash
cd frontend
npm install
npm run dev     # http://localhost:3000
```

### 2. 백엔드
```bash
cd backend
npm install
npm run dev     # http://localhost:4000
```

### 3. 데이터베이스 (선택)
- MSSQL 서버가 없어도 프론트엔드는 **로컬 스토리지 모드**로 동작합니다
- DB 연결 시 `backend/src/data-source.ts`에서 접속 정보를 수정하세요

## 핸디캡 계산 방식

```
핸디캡 = (내 G핸디 - 최저 G핸디) × 핸디캡 비율
```

**예시** (비율 80%, 반올림 적용):
| 선수 | G핸디 | 차이 | ×80% | 핸디캡 |
|------|-------|------|------|--------|
| 김철수 | 18 | 0 | 0 | **0** |
| 이영희 | 24 | 6 | 4.8 | **5** |
| 박민수 | 30 | 12 | 9.6 | **10** |

넷스코어 = 그로스스코어 - 핸디캡
