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

// 세션 미들웨어 설정을 상수로 저장
const sessionMiddleware = session({
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
});

app.use(sessionMiddleware);
io.engine.use(sessionMiddleware);

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
    try {
        await pool.query('INSERT INTO messages (username, text) VALUES ($1, $2)', [username, text]);
        console.log('메시지 저장 성공:', username, text);
    } catch (err) {
        console.error('메시지 저장 실패:', err);
    }
}

async function getMessages() {
    try {
        const res = await pool.query('SELECT * FROM messages ORDER BY timestamp ASC');
        console.log('메시지 불러오기 성공:', res.rows.length, '개의 메시지');
        return res.rows;
    } catch (err) {
        console.error('메시지 불러오기 실패:', err);
        return [];
    }
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

// Socket.IO 연결 처리
io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('chatMessage', async (data) => {
        // 세션에서 사용자 정보 확인
        const session = socket.request.session;
        const username = data.username; // 클라이언트에서 전송된 username 사용

        if (username) {
            console.log(`Message received from ${username}: ${data.message}`);
            await saveMessages(username, data.message);
            io.emit('chatMessage', data);
        } else {
            console.log('Unauthorized user attempted to send a message');
            socket.emit('chatError', { 
                message: '채팅을 하려면 먼저 로그인해주세요!',
                type: 'error'
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

// 회원가입 엔드포인트 수정
app.post('/register', async (req, res) => {
    try {
        const { username, password, teacherCode } = req.body;
        
        // 사용자 이름 중복 검사
        const existingUser = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: '이미 존재하는 사용자 이름입니다.' });
        }

        // 선생님 코드 검증
        if (teacherCode) {
            if (teacherCode !== process.env.TEACHER_SECRET_CODE) {
                return res.status(400).json({ error: '선생님 코드가 올바르지 않습니다.' });
            }
        }

        // 비밀번호 해시화
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 선생님 여부 확인
        const isTeacher = teacherCode === process.env.TEACHER_SECRET_CODE;
        
        // 사용자 등록
        const result = await pool.query(
            'INSERT INTO users (username, password, is_teacher) VALUES ($1, $2, $3) RETURNING *',
            [username, hashedPassword, isTeacher]
        );

        // 세션에 사용자 정보 저장
        req.session.user = {
            id: result.rows[0].id,
            username: result.rows[0].username,
            isTeacher: result.rows[0].is_teacher
        };
        
        res.json({ 
            message: '회원가입 성공',
            user: {
                username: result.rows[0].username,
                isTeacher: result.rows[0].is_teacher
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 로그인 엔드포인트
app.post('/login', async (req, res) => {
    console.log('로그인 시도:', req.body.username);
    
    try {
        const { username, password } = req.body;
        
        // 사용자 조회
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: '사용자를 찾을 수 없습니다.' 
            });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(400).json({ 
                success: false, 
                message: '비밀번호가 일치하지 않습니다.' 
            });
        }

        // 세션에 사용자 정보 저장
        req.session.user = {
            id: user.id,
            username: user.username,
            isTeacher: user.is_teacher
        };

        await new Promise((resolve, reject) => {
            req.session.save(err => {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log('로그인 성공, 세션 저장됨:', req.session);

        // 클라이언트에 성공 응답 보내기
        res.status(200).json({
            success: true,
            user: {
                username: user.username,
                isTeacher: user.is_teacher
            }
        });

    } catch (err) {
        console.error('로그인 오류:', err);
        res.status(500).json({ 
            success: false, 
            message: '서버 오류가 발생했습니다.' 
        });
    }
});

// 로그아웃 엔드포인트
app.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// 게시물 작성
app.post('/api/posts', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const { title, content, type } = req.body;
    
    // 공지사항은 선생님만 작성 가능
    if (type === 'notice' && !req.session.user.isTeacher) {
        return res.status(403).json({ error: '권한이 없습니다.' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO posts (type, title, content, author, is_teacher) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [type, title, content, req.session.user.username, req.session.user.isTeacher]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 게시물 목록 조회
app.get('/api/posts', async (req, res) => {
    const filter = req.query.filter || 'all';
    try {
        let query = 'SELECT * FROM posts';
        if (filter !== 'all') {
            query += ' WHERE type = $1';
        }
        query += ' ORDER BY created_at DESC';

        const result = filter === 'all' 
            ? await pool.query(query)
            : await pool.query(query, [filter]);
            
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 댓글 작성
app.post('/api/comments', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const { postId, content } = req.body;

    try {
        const result = await pool.query(
            'INSERT INTO comments (post_id, content, author) VALUES ($1, $2, $3) RETURNING *',
            [postId, content, req.session.user.username]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 댓글 채택
app.post('/api/comments/:commentId/accept', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const { commentId } = req.params;
    const { postId } = req.body;

    try {
        // 게시물 작성자 또는 선생님 확인
        const post = await pool.query('SELECT * FROM posts WHERE id = $1', [postId]);
        const isAuthor = post.rows[0].author === req.session.user.username;
        const isTeacher = req.session.user.isTeacher;

        if (!isAuthor && !isTeacher) {
            return res.status(403).json({ error: '권한이 없습니다.' });
        }

        // 이전에 채택된 댓글이 있다면 취소
        await pool.query(
            'UPDATE comments SET is_accepted = FALSE WHERE post_id = $1',
            [postId]
        );

        // 새로운 댓글 채택
        const result = await pool.query(
            `UPDATE comments 
            SET is_accepted = TRUE, 
                accepted_by = $1, 
                accepted_by_teacher = $2 
            WHERE id = $3 
            RETURNING *`,
            [req.session.user.username, isTeacher, commentId]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 댓글 목록 조회
app.get('/api/posts/:postId/comments', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM comments WHERE post_id = $1 ORDER BY created_at ASC',
            [req.params.postId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
