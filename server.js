const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cron = require("node-cron");

const app = express();
const PORT = process.env.PORT || 3000;
const filePath = path.join(__dirname, "data", "responses.json");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/data", express.static(path.join(__dirname, "data")));

// 🔹 메인 페이지
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 🔹 응답 보기
app.get("/responses", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "responses.html"));
});

// 🔹 통계 보기
app.get("/stats", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "stats.html"));
});

// 🔹 사용자 응답 저장
app.post("/submit", (req, res) => {
  let responses = [];
  if (fs.existsSync(filePath)) {
    try {
      responses = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch (err) {
      console.error("JSON 파싱 오류:", err);
    }
  }

  responses.push(req.body);
  fs.writeFileSync(filePath, JSON.stringify(responses, null, 2));
  res.json({ status: "saved" });
});

// 🔹 수집 데이터 초기화 (비밀번호 보호)
app.get("/reset-data", (req, res) => {
  res.send(`
    <h2>🔐 수집된 데이터 초기화</h2>
    <form method="POST">
      <label>비밀번호를 입력하세요: <input type="password" name="pw" /></label>
      <button type="submit">초기화</button>
    </form>
  `);
});

app.post("/reset-data", (req, res) => {
  const pw = req.body.pw;
  if (pw === "0000") {
    fs.writeFileSync(filePath, "[]");
    res.send("<h3>✅ 데이터가 성공적으로 초기화되었습니다.</h3><a href='/'>메인으로</a>");
  } else {
    res.send("<h3>❌ 비밀번호가 틀렸습니다.</h3><a href='/reset-data'>다시 시도</a>");
  }
});

// 🔁 30분마다 GitHub에 responses.json 자동 백업 (변경이 있는 경우만)
cron.schedule("*/30 * * * *", async () => {
  try {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO;
    const FILE_NAME = "data/responses.json";

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const base64 = Buffer.from(fileContent).toString("base64");

    const getRes = await axios.get(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_NAME}`,
      {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}` },
      }
    );

    const remoteContent = Buffer.from(getRes.data.content, 'base64').toString('utf-8');
    const remoteSha = getRes.data.sha;

    if (remoteContent.trim() === fileContent.trim()) {
      console.log("ℹ️ 변경 없음 - GitHub 업로드 생략");
      return;
    }

    // 변경된 경우에만 업데이트
    await axios.put(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_NAME}`,
      {
        message: `Auto backup at ${new Date().toISOString()}`,
        content: base64,
        sha: remoteSha,
      },
      {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}` },
      }
    );

    console.log("✅ GitHub에 responses.json 백업 완료됨 (변경 감지됨)");
  } catch (err) {
    console.error("❌ GitHub 백업 실패:", err.response?.data || err.message);
  }
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});
