const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const app = express();
const http = require('http');
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const io = require('socket.io')(server, {
    cors: {
        origin: ["http://localhost:3000"],
        methods: ["GET", "POST"],
        credentials: true
    }
});

// CORS 미들웨어 추가
app.use(cors({
    origin: ["http://localhost:3000"],
    methods: ['GET', 'POST'],
    credentials: true
}));

// 정적 파일을 제공할 디렉토리 설정
app.use(express.static('public'));
app.use('/images', express.static(path.join(__dirname, 'public/images')));  // 이미지 경로 명시적 설정

// JSON 파싱을 위한 미들웨어 추가
app.use(express.json());

// 웹사이트 데이터를 저장할 JSON 파일 경로
const websitesPath = path.join(__dirname, 'data', 'websites.json');

// 채팅 데이터를 저장할 JSON 파일 경로 추가
const chatsPath = path.join(__dirname, 'data', 'chats.json');

// 데이터 디렉토리가 없으면 생성
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

// 채팅 파일이 없으면 빈 배열로 초기화
if (!fs.existsSync(chatsPath)) {
    fs.writeFileSync(chatsPath, JSON.stringify([], null, 2));
}

// 웹사이트 목록 가져오기
app.get('/api/websites', (req, res) => {
    try {
        if (fs.existsSync(websitesPath)) {
            const data = fs.readFileSync(websitesPath, 'utf8');
            res.json(JSON.parse(data));
        } else {
            res.json([]);
        }
    } catch (error) {
        res.status(500).json({ error: '데이터를 불러오는데 실패했습니다.' });
    }
});

// 새로운 웹사이트 저장
app.post('/api/websites', (req, res) => {
    try {
        const { name, url } = req.body;
        let websites = [];
        
        if (fs.existsSync(websitesPath)) {
            websites = JSON.parse(fs.readFileSync(websitesPath, 'utf8'));
        }
        
        websites.push({ name, url });
        fs.writeFileSync(websitesPath, JSON.stringify(websites, null, 2));
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: '데이터 저장에 실패했습니다.' });
    }
});

// Socket.IO 연결 처리
io.on('connection', (socket) => {
    console.log('사용자가 연결되었습니다.');

    // 채팅 메시지 처리
    socket.on('chat message', (msg) => {
        try {
            const chats = fs.existsSync(chatsPath) 
                ? JSON.parse(fs.readFileSync(chatsPath, 'utf8')) 
                : [];
            chats.push({ message: msg, timestamp: new Date().toISOString() });
            fs.writeFileSync(chatsPath, JSON.stringify(chats, null, 2));
            io.emit('chat message', msg);
        } catch (error) {
            console.error('채팅 저장 중 오류 발생:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('사용자가 연결을 해제했습니다.');
    });
});

// 루트 경로로 접근시 index.html 제공
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 서버 시작
server.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`http://localhost:${PORT}`);
});
