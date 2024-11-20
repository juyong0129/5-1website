const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { Pool } = require('pg'); // pg 모듈 추가
const http = require('http'); // HTTP 서버 생성
const { Server } = require('socket.io'); // Socket.IO에서 Server 가져오기

const app = express();
const server = http.createServer(app); // HTTP 서버로 앱 감싸기
const io = new Server(server); // Socket.IO 서버 생성
const port = 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// PostgreSQL 연결 설정
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// sites 배열 초기화
let sites = [];

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

// messages 테이블에 메시지 삽입
async function saveMessages(text) {
  await pool.query('INSERT INTO messages (text) VALUES ($1)', [text]);
  console.log('Message saved to database:', text);
}

async function getMessages() {
  const res = await pool.query('SELECT * FROM messages ORDER BY timestamp ASC');
  return res.rows; // 저장된 메시지 리스트 반환
}



// 서버 시작 시 sites, messages 로드
loadSites();
getMessages();

app.post('/submit', async (req, res) => {
  const { name, url } = req.body;
  console.log(`Received data: ${name}, ${url}`); // 요청 데이터 로그
  await saveSites(name, url);
  res.send('Data received and stored');
});

app.get('/messages', async (req, res) => {
  try {
    const messages = await getMessages(); // 데이터베이스에서 메시지 가져오기
    res.json(messages); // 메시지를 JSON 형식으로 반환
  } catch (err) {
    res.status(500).send('Error retrieving messages');
  }
});

app.get('/sites', (req, res) => {
  res.json(sites);
});

// 루트 경로 추가
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('chatMessage', async (msg) => {
    console.log(`Message received: ${msg}`);
    await saveMessages(msg); // 메시지를 데이터베이스에 저장
    io.emit('chatMessage', msg); // 모든 클라이언트에 메시지 전송
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});