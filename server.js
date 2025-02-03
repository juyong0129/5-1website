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
        const result = await pool.query(
            'INSERT INTO websites (name, url) VALUES ($1, $2) RETURNING *',
            [name, url]
        );
        res.json(result.rows[0]);
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

// Socket.IO 연결 처리
io.on('connection', (socket) => {
    console.log('사용자가 연결되었습니다.');

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
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
