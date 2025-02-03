const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
const http = require('http');
const server = http.createServer(app);
const pool = require('./db/config');
const PORT = process.env.PORT || 3000;
const io = require('socket.io')(server, {
    cors: {
        origin: ["http://localhost:3000"],
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(cors({
    origin: ["http://localhost:3000"],
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.static('public'));
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use(express.json());

// 웹사이트 목록 가져오기
app.get('/api/websites', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM websites ORDER BY created_at ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('데이터베이스 조회 오류:', error);
        res.status(500).json({ error: '데이터를 불러오는데 실패했습니다.' });
    }
});

// 새로운 웹사이트 저장
app.post('/api/websites', async (req, res) => {
    try {
        const { name, url } = req.body;
        
        // URL이 이미 존재하는지 확인
        const existingWebsite = await pool.query(
            'SELECT * FROM websites WHERE url = $1',
            [url]
        );
        
        if (existingWebsite.rows.length > 0) {
            // 이미 존재하는 경우 수신 횟수 증가
            const result = await pool.query(
                'UPDATE websites SET receive_count = receive_count + 1 WHERE url = $1 RETURNING *',
                [url]
            );
            res.json(result.rows[0]);
        } else {
            // 새로운 웹사이트 추가 (초기 수신 횟수 1로 시작)
            const result = await pool.query(
                'INSERT INTO websites (name, url, receive_count) VALUES ($1, $2, 1) RETURNING *',
                [name, url]
            );
            res.json(result.rows[0]);
        }
    } catch (error) {
        console.error('데이터베이스 저장 오류:', error);
        res.status(500).json({ error: '데이터 저장에 실패했습니다.' });
    }
});

// 채팅 내역 가져오기
app.get('/api/chats', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM chats ORDER BY timestamp ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('채팅 내역 조회 오류:', error);
        res.status(500).json({ error: '채팅 내역을 불러오는데 실패했습니다.' });
    }
});

// 웹사이트 클릭 수 증가
app.post('/api/websites/:id/receive', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'UPDATE websites SET receive_count = receive_count + 1 WHERE id = $1 RETURNING *',
            [id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('수신 횟수 업데이트 오류:', error);
        res.status(500).json({ error: '수신 횟수 업데이트에 실패했습니다.' });
    }
});

let CountOfPeople = 0;
// Socket.IO 연결 처리
io.on('connection', (socket) => {
    console.log('사용자가 연결되었습니다.');
    CountOfPeople++;
    // 접속자 수 업데이트를 모든 클라이언트에 브로드캐스트
    io.emit('updateCount', CountOfPeople);

    socket.on('chat message', async (msg) => {
        try {
            const result = await pool.query(
                'INSERT INTO chats (message) VALUES ($1) RETURNING *',
                [msg]
            );
            io.emit('chat message', msg);
        } catch (error) {
            console.error('채팅 저장 오류:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('사용자가 연결을 해제했습니다.');
        CountOfPeople--;
        // 접속자 수 업데이트를 모든 클라이언트에 브로드캐스트
        io.emit('updateCount', CountOfPeople);
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 회원가입
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, name } = req.body;
        
        // 아이디 중복 확인
        const existingUser = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: '이미 존재하는 아이디입니다.' });
        }
        
        // 새 사용자 등록
        const result = await pool.query(
            'INSERT INTO users (username, password, name) VALUES ($1, $2, $3) RETURNING *',
            [username, password, name]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('회원가입 오류:', error);
        res.status(500).json({ error: '회원가입에 실패했습니다.' });
    }
});

// 로그인
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1 AND password = $2',
            [username, password]
        );
        
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(401).json({ error: '아이디 또는 비밀번호가 잘못되었습니다.' });
        }
    } catch (error) {
        console.error('로그인 오류:', error);
        res.status(500).json({ error: '로그인에 실패했습니다.' });
    }
});

// 로그아웃
app.post('/api/logout', (req, res) => {
    try {
        res.json({ message: '로그아웃 되었습니다.' });
    } catch (error) {
        console.error('로그아웃 오류:', error);
        res.status(500).json({ error: '로그아웃에 실패했습니다.' });
    }
});

// 서버 시작 전에 데이터베이스 연결 테스트
pool.connect()
    .then(() => {
        console.log('데이터베이스 연결 성공');
        server.listen(PORT, () => {
            console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
            console.log(`http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('데이터베이스 연결 실패:', err);
        process.exit(1);
    });

