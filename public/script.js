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

    function displayStoredTalk() {
        // 서버에서 메시지 로드하여 ul에 추가
        fetch('/messages')
        .then(response => response.json())
        .then(messages => {
            const msgText = document.getElementById('msgText'); // ul 요소
            messages.forEach(msg => {
                const newMsg = document.createElement('li'); // li 요소 생성
                newMsg.textContent = msg.text; // 메시지 텍스트 설정
                msgText.appendChild(newMsg); // ul에 li 추가
            });
        })
        .catch(error => console.error('Error fetching messages:', error));
    }
    
    displayStoredTalk()
    
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
            // welcomeMessage에서 사용자 이름을 가져옴
            const username = welcomeMessage.textContent.split(',')[0].replace('환영합니다', '').trim();
            if (!username) {
                alert('채팅을 하려면 먼저 로그인해주세요!');
                
                // 로그인 버튼에 애니메이션 효과 추가
                const loginText = document.getElementById('loginText');
                loginText.classList.add('highlight-animation');
                
                // 애니메이션이 끝나면 클래스 제거
                setTimeout(() => {
                    loginText.classList.remove('highlight-animation');
                }, 2000); // 2초 후 제거
                
                return;
            }
            socket.emit('chatMessage', { username, message });
            msgInput.value = '';
        }
    });

    // 서버에서 메시지 수신 처리
    socket.on('chatMessage', function (data) {
        const newMsg = document.createElement('li');
        newMsg.textContent = `${data.username}: ${data.message}`; // 사용자 이름과 메시지를 함께 표시
        msgText.appendChild(newMsg);
    });

    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const loginText = document.getElementById('loginText');
    const registerLink = document.getElementById('registerLink');
    const closeBtns = document.getElementsByClassName('close');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const userInfo = document.getElementById('userInfo');
    const welcomeMessage = document.getElementById('welcomeMessage');
    const logoutBtn = document.getElementById('logoutBtn');

    // 모달 열기
    loginText.onclick = () => {
        loginModal.style.display = "block";
    }

    registerLink.onclick = () => {
        loginModal.style.display = "none";
        registerModal.style.display = "block";
    }

    // 모달 닫기
    Array.from(closeBtns).forEach(btn => {
        btn.onclick = function() {
            loginModal.style.display = "none";
            registerModal.style.display = "none";
        }
    });

    // 모달 외부 클릭시 닫기
    window.onclick = (event) => {
        if (event.target == loginModal) {
            loginModal.style.display = "none";
        }
        if (event.target == registerModal) {
            registerModal.style.display = "none";
        }
    }

    // 로그인 처리
    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        if (data.success) {
            loginModal.style.display = "none";
            loginText.style.display = "none";
            userInfo.style.display = "block";
            welcomeMessage.textContent = `환영합니다, ${username}님!`;
            loginForm.reset();
        } else {
            alert(data.message || '로그인 실패');
        }
    }

    // 회원가입 처리
    registerForm.onsubmit = async (e) => {
        e.preventDefault();
        const username = document.getElementById('regUsername').value;
        const password = document.getElementById('regPassword').value;
        
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        if (data.success) {
            alert('회원가입 성공!');
            registerModal.style.display = "none";
            loginModal.style.display = "block";
            registerForm.reset();
        } else {
            alert(data.message || '회원가입 실패');
        }
    }

    // 로그아웃 처리
    logoutBtn.onclick = async () => {
        const response = await fetch('/logout', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            loginText.style.display = "block";
            userInfo.style.display = "none";
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
        }
    }
});
