const pool = require('./config');
const path = require('path');

async function initDatabase() {
    try {
        // SQL 파일 읽기
        const fs = require('fs');
        const sql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
        
        // 데이터베이스 테이블 생성
        await pool.query(sql);
        console.log('데이터베이스 테이블이 성공적으로 생성되었습니다.');

        // 초기 데이터 삽입 (선택사항)
        const initialWebsites = [
            { name: 'google', url: 'https://www.google.com/' },
            { name: 'toolkit', url: 'https://toolkit.i-scream.co.kr/' },
            { name: 'chatgpt', url: 'https://chatgpt.com/' }
        ];

        // 웹사이트 초기 데이터 삽입
        for (const website of initialWebsites) {
            await pool.query(
                'INSERT INTO websites (name, url) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [website.name, website.url]
            );
        }

        console.log('데이터베이스 초기화가 완료되었습니다.');
    } catch (error) {
        console.error('데이터베이스 초기화 오류:', error);
    } finally {
        await pool.end();
    }
}

initDatabase();