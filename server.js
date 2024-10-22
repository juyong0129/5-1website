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

const users = [{ username: 'teacher', password: '0123456789' }]; // 실제로는 데이터베이스에 저장된 사용자 정보로 대체

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

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

// 시간표 데이터 가져오기
app.get('/timetable', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM timetable');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('서버 오류');
  }
});

// 시간표 데이터 저장
app.post('/timetable', async (req, res) => {
  const { time, monday, tuesday, wednesday, thursday, friday } = req.body;
  try {
    await pool.query(
      'INSERT INTO timetable (time, monday, tuesday, wednesday, thursday, friday) VALUES ($1, $2, $3, $4, $5, $6)',
      [time, monday, tuesday, wednesday, thursday, friday]
    );
    res.send('시간표 데이터 저장 완료');
  } catch (err) {
    console.error(err);
    res.status(500).send('서버 오류');
  }
});

// 루트 경로 추가
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
