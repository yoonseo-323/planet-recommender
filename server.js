const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;

const DATA_FILE = path.join(__dirname, "data", "responses.json");

// 데이터 폴더/파일 없으면 자동 생성
if (!fs.existsSync("data")) fs.mkdirSync("data");
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");

// public 폴더 안 HTML, JS 파일 제공
app.use(express.static("public"));
app.use(bodyParser.json());
app.use('/data', express.static(path.join(__dirname, 'data')));

// 설문 응답 저장
app.post("/submit", (req, res) => {
  const data = req.body;
  const responses = JSON.parse(fs.readFileSync(DATA_FILE));
  responses.push({ ...data, timestamp: new Date().toISOString() });
  fs.writeFileSync(DATA_FILE, JSON.stringify(responses, null, 2));
  res.send({ status: "ok" });
});

// 통계용 API
app.get("/api/stats", (req, res) => {
  const responses = JSON.parse(fs.readFileSync(DATA_FILE));
  const planetCounts = {};
  for (const r of responses) {
    planetCounts[r.planet] = (planetCounts[r.planet] || 0) + 1;
  }
  res.send(planetCounts);
});


// 경로에 index 보내기기
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 서버에 stats 경로 연결
app.get("/stats", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "stats.html"));
});
//서버에 response 경로 연결
app.get('/responses', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'responses.html'));
});

// 포트 설정 (Render가 환경변수로 지정)
const PORT = process.env.PORT || 3000;
// 서버 시작
app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});
