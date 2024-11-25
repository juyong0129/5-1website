const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { Pool } = require('pg');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcrypt');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = 3000;

// PostgreSQL 연결 설정
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// 세션 미들웨어 설정
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'session'
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000
    }
}));

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

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

// messages 테이블에 메시지 삽입 함수 수정
async function saveMessages(username, text) {
    await pool.query('INSERT INTO messages (username, text) VALUES ($1, $2)', [username, text]);
    console.log('Message saved to database:', username, text);
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

  socket.on('chatMessage', async (data) => {
    console.log(`Message received from ${data.username}: ${data.message}`);
    await saveMessages(data.username, data.message); // 사용자 이름과 메시지를 저장
    io.emit('chatMessage', data); // 모든 클라이언트에 사용자 이름과 메시지 전송
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// 회원가입 엔드포인트
app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // 사용자 이름 중복 검사
        const existingUser = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: '이미 존재하는 사용자 이름입니다.' 
            });
        }

        // 비밀번호 해시화 및 새 사용자 등록
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (username, password) VALUES ($1, $2)',
            [username, hashedPassword]
        );
        
        res.json({ success: true });
    } catch (err) {
        console.error('회원가입 에러:', err);
        res.status(500).json({ 
            success: false, 
            message: '회원가입 처리 중 오류가 발생했습니다.' 
        });
    }
});

// 로그인 엔드포인트
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        
        if (result.rows.length > 0) {
            const validPassword = await bcrypt.compare(password, result.rows[0].password);
            if (validPassword) {
                req.session.user = { username };
                res.json({ success: true });
                return;
            }
        }
        res.status(401).json({ success: false, message: '로그인 실패' });
    } catch (err) {
        res.status(500).json({ success: false, message: '서버 오류' });
    }
});

// 로그아웃 엔드포인트
app.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});