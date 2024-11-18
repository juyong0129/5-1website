document.addEventListener('DOMContentLoaded', function () {
    // 설문조사 관련 요소
    const form = document.getElementById('siteForm');
    const output = document.getElementById('output');
    
    // 실시간 채팅 관련 요소
    const msgForm = document.getElementById('msg');
    const msgInput = document.getElementById('msgBox');
    const msgText = document.getElementById('msgText');

    // 교시 시간표 데이터
    const periods = [
        { start: "09:00", end: "09:40", period: "1교시" },
        { start: "09:50", end: "10:30", period: "2교시" },
        { start: "10:40", end: "11:20", period: "3교시" },
        { start: "11:30", end: "12:10", period: "4교시" },
        { start: "13:00", end: "13:40", period: "5교시" },
        { start: "13:50", end: "14:30", period: "6교시" },
        { start: "14:30", end: "15:10", period: "7교시" }
    ];

    // Socket.IO 클라이언트 초기화
    const socket = io();

    // 설문조사 폼 제출 처리
    form.addEventListener('submit', function (event) {
        event.preventDefault();
        
        const question1 = document.getElementById('question1').value;
        const question2 = document.getElementById('question2').value;
        
        // 서버로 데이터 전송
        fetch('/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: question1, url: question2 })
        })
        .then(response => response.text())
        .then(data => {
            alert(data);
            displayStoredData();
        });

        form.reset();
    });

    // 서버에서 저장된 데이터를 가져와 출력
    function displayStoredData() {
        fetch('/sites')
        .then(response => response.json())
        .then(sites => {
            if (sites.length > 0) {
                output.innerHTML = '<h2>친구들이 좋아하는 사이트</h2><ul>';
                sites.forEach(site => {
                    output.innerHTML += `<li>사이트 이름: ${site.name}, 사이트 주소: <a href="${site.url}" target="_blank">${site.url}</a> (수신된 횟수: ${site.count})</li>`;
                });
                output.innerHTML += '</ul>';
            } else {
                output.innerHTML = '<p>첫번째로 설문조사에 참여해 보세요!</p>';
            }
        });
    }

    // 페이지 로드 시 저장된 데이터를 출력
    displayStoredData();

    // 현재 교시 업데이트
    function updateCurrentPeriod() {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        const currentPeriodElement = document.getElementById('currentPeriod');

        let currentPeriod = "쉬는 시간입니다!";
        for (const period of periods) {
            if (currentTime >= period.start && currentTime < period.end) {
                currentPeriod = `지금은 ${period.period}입니다!`;
                break;
            }
        }
        
        if (currentTime > "15:10") {
            currentPeriod = "수업이 종료되었습니다!";
        }

        currentPeriodElement.textContent = `현재 시각: ${currentTime} - ${currentPeriod}`;
    }

    // 페이지 로드 시와 매 분마다 현재 교시 업데이트
    updateCurrentPeriod();
    setInterval(updateCurrentPeriod, 60000);

    // 실시간 채팅: 메시지 전송 처리
    msgForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const message = msgInput.value;
        if (message.trim()) {
            socket.emit('chatMessage', message); // 서버로 메시지 전송
            msgInput.value = ''; // 입력창 비우기
        }
    });

    // 서버에서 메시지 수신 처리
    socket.on('chatMessage', function (msg) {
        const newMsg = document.createElement('li');
        newMsg.textContent = msg;
        msgText.appendChild(newMsg);
    });
});
