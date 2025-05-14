const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

const DATA_FILE = path.join(__dirname, "data", "responses.json");

app.post("/submit", (req, res) => {
  const newEntry = req.body;
  let responses = [];

  if (fs.existsSync(DATA_FILE)) {
    responses = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  }

  responses.push(newEntry);
  fs.writeFileSync(DATA_FILE, JSON.stringify(responses, null, 2));
  res.json({ status: "saved" });
});

app.get("/data/responses.json", (req, res) => {
  if (!fs.existsSync(DATA_FILE)) return res.json([]);
  const data = fs.readFileSync(DATA_FILE, "utf-8");
  res.setHeader("Content-Type", "application/json");
  res.send(data);
});

app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});
