const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { Pool } = require('pg'); // pg 모듈 추가
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// PostgreSQL 연결 설정
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// sites 배열 초기화
let sites = [];
let teacherSites = [];

// PostgreSQL에서 sites를 로드하는 함수
async function loadSites() {
  try {
    const res = await pool.query('SELECT * FROM sites');
    sites = res.rows;
  } catch (err) {
    console.log(err);
    sites = [];
  }
}

// PostgreSQL에 sites를 저장하는 함수
async function saveSites(name, url) {
  const existingSite = sites.find(site => site.name === name && site.url === url);
  if (existingSite) {
    existingSite.count += 1;
    await pool.query('UPDATE sites SET count = $1 WHERE name = $2 AND url = $3', [existingSite.count, name, url]);
  } else {
    const newSite = { name, url, count: 1 };
    sites.push(newSite);
    await pool.query('INSERT INTO sites (name, url, count) VALUES ($1, $2, $3)', [name, url, 1]);
  }
}

// PostgreSQL에서 teacherSites를 로드하는 함수
async function loadTeacherSites() {
  try {
    const res = await pool.query('SELECT * FROM teacher_sites');
    teacherSites = res.rows;
  } catch (err) {
    console.log(err);
    teacherSites = [];
  }
}

// PostgreSQL에 teacherSites를 저장하는 함수
async function saveTeacherSites(name, url) {
  const existingSite = teacherSites.find(site => site.name === name && site.url === url);
  if (existingSite) {
    existingSite.count += 1;
    await pool.query('UPDATE teacher_sites SET count = $1 WHERE name = $2 AND url = $3', [existingSite.count, name, url]);
  } else {
    const newSite = { name, url, count: 1 };
    teacherSites.push(newSite);
    await pool.query('INSERT INTO teacher_sites (name, url, count) VALUES ($1, $2, $3)', [name, url, 1]);
  }
}

// 서버 시작 시 sites 및 teacherSites 로드
loadSites();
loadTeacherSites();

app.post('/submit', async (req, res) => {
  const { name, url } = req.body;
  console.log(`Received data: ${name}, ${url}`); // 요청 데이터 로그
  await saveSites(name, url);
  res.send('Data received and stored');
});

app.get('/sites', (req, res) => {
  res.json(sites);
});

app.post('/submitTeacherSite', async (req, res) => {
  const { name, url } = req.body;
  console.log(`Received teacher site: ${name}, ${url}`);
  await saveTeacherSites(name, url);
  res.send('Teacher site received and stored');
});

app.get('/teacherSites', (req, res) => {
  res.json(teacherSites);
});

// 루트 경로 추가
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
