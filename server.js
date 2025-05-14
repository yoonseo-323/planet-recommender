const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cron = require("node-cron");
const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, "data", "responses.json");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// 제출 저장
app.post("/submit", (req, res) => {
  let data = [];
  if (fs.existsSync(DATA_FILE)) {
    try {
      data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    } catch (e) {
      console.error("JSON parse error:", e);
    }
  }

  data.push(req.body);
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  res.json({ status: "saved" });
});

// 응답 조회
app.get("/data/responses.json", (req, res) => {
  if (!fs.existsSync(DATA_FILE)) return res.json([]);
  res.setHeader("Content-Type", "application/json");
  res.send(fs.readFileSync(DATA_FILE, "utf-8"));
});

// 응답 초기화 (비밀번호: 0000)
app.post("/reset-data", (req, res) => {
  const { password } = req.body;
  if (password === "0000") {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
    return res.json({ success: true });
  } else {
    return res.json({ success: false, message: "비밀번호가 틀렸습니다." });
  }
});

// GitHub 자동 백업 (30분마다, 변경시만)
cron.schedule("*/30 * * * *", async () => {
  try {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO;
    const FILE_NAME = "data/responses.json";
    const fileContent = fs.readFileSync(DATA_FILE, "utf-8");
    const base64 = Buffer.from(fileContent).toString("base64");

    const getRes = await axios.get(`https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_NAME}`, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}` },
    });

    const remoteContent = Buffer.from(getRes.data.content, 'base64').toString('utf-8');
    const remoteSha = getRes.data.sha;

    if (remoteContent.trim() === fileContent.trim()) {
      console.log("ℹ️ 변경 없음 - GitHub 업로드 생략");
      return;
    }

    await axios.put(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_NAME}`,
      {
        message: `Auto backup at ${new Date().toISOString()}`,
        content: base64,
        sha: remoteSha
      },
      {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}` }
      }
    );

    console.log("✅ GitHub 백업 완료");
  } catch (err) {
    console.error("❌ GitHub 백업 실패:", err.response?.data || err.message);
  }
});

app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});
