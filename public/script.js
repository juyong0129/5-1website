document.addEventListener('DOMContentLoaded', function () {
    // DOM 요소 초기화
    const elements = {
        chat: {
            form: document.getElementById('msg'),
            input: document.getElementById('msgBox'),
            messageList: document.getElementById('msgText')
        },
        survey: {
            form: document.getElementById('siteForm'),
            output: document.getElementById('output')
        },
        auth: {
            loginModal: document.getElementById('loginModal'),
            registerModal: document.getElementById('registerModal'),
            loginText: document.getElementById('loginText'),
            registerLink: document.getElementById('registerLink'),
            loginForm: document.getElementById('loginForm'),
            registerForm: document.getElementById('registerForm'),
            userInfo: document.getElementById('userInfo'),
            welcomeMessage: document.getElementById('welcomeMessage'),
            logoutBtn: document.getElementById('logoutBtn')
        },
        timetable: {
            currentPeriod: document.getElementById('currentPeriod')
        }
    };

    // Socket.IO 초기화
    const socket = io();

    // 채팅 관련 함수들
    const chatHandler = {
        getCurrentUser: () => {
            const welcomeText = elements.auth.welcomeMessage.textContent;
            return welcomeText ? welcomeText.split('환영합니다,')[1]?.split('님!')[0]?.trim() : null;
        },

        displayMessage: (data, currentUser) => {
            const messageElement = document.createElement('li');
            const messageContainer = document.createElement('div');
            const messageInfo = document.createElement('div');
            
            const timeString = new Date().toLocaleTimeString('ko-KR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });

            messageInfo.textContent = `${data.username} • ${timeString}`;
            messageContainer.className = 'chat-message';
            
            if (currentUser && data.username === currentUser) {
                messageContainer.className += ' message-right';
            } else {
                messageContainer.className += ' message-left';
            }

            messageContainer.appendChild(messageInfo);
            messageContainer.appendChild(document.createTextNode(data.message));
            messageElement.appendChild(messageContainer);
            elements.chat.messageList.appendChild(messageElement);
            
            elements.chat.messageList.scrollTop = elements.chat.messageList.scrollHeight;
        },

        loadStoredMessages: async () => {
            try {
                const response = await fetch('/messages');
                const messages = await response.json();
                elements.chat.messageList.innerHTML = '';
                const currentUser = chatHandler.getCurrentUser();
                
                messages.forEach(msg => {
                    chatHandler.displayMessage({
                        username: msg.username,
                        message: msg.text
                    }, currentUser);
                });
            } catch (error) {
                console.error('메시지 로딩 실패:', error);
            }
        }
    };

    // 시간표 관련 함수들
    const timetableHandler = {
        getCurrentPeriod: () => {
            const now = new Date();
            const hour = now.getHours();
            const minute = now.getMinutes();
            const time = hour * 60 + minute;

            if (time >= 9 * 60 && time < 9 * 60 + 40) return 1;
            if (time >= 9 * 60 + 50 && time < 10 * 60 + 30) return 2;
            if (time >= 10 * 60 + 40 && time < 11 * 60 + 20) return 3;
            if (time >= 11 * 60 + 30 && time < 12 * 60 + 10) return 4;
            if (time >= 13 * 60 && time < 13 * 60 + 40) return 5;
            if (time >= 13 * 60 + 50 && time < 14 * 60 + 30) return 6;
            if (time >= 14 * 60 + 30 && time < 15 * 60 + 10) return 7;
            return 0;
        },

        updateCurrentPeriod: () => {
            const period = timetableHandler.getCurrentPeriod();
            if (period === 0) {
                elements.timetable.currentPeriod.textContent = '현재는 수업 시간이 아닙니다.';
            } else {
                elements.timetable.currentPeriod.textContent = `현재 ${period}교시 진행중`;
            }
        }
    };

    // 이벤트 리스너 설정
    const setupEventListeners = () => {
        // 채팅 메시지 전송
        elements.chat.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentUser = chatHandler.getCurrentUser();
            
            if (!currentUser) {
                alert('채팅을 하려면 먼저 로그인해주세요!');
                elements.auth.loginModal.style.display = 'block';
                return;
            }

            const message = elements.chat.input.value.trim();
            if (message) {
                const messageData = {
                    username: currentUser,
                    message: message
                };

                socket.emit('chatMessage', messageData);
                elements.chat.input.value = '';
            }
        });

        // 채팅 에러 처리
        socket.on('chatError', (error) => {
            if (error.type === 'error') {
                alert(error.message);
                elements.auth.loginModal.style.display = 'block';
            }
        });

        // 로그아웃 처리
        elements.auth.logoutBtn.onclick = async () => {
            const response = await fetch('/logout', { method: 'POST' });
            if (response.ok) {
                elements.auth.loginText.style.display = 'block';
                elements.auth.userInfo.style.display = 'none';
                elements.auth.welcomeMessage.textContent = '';
                elements.chat.messageList.innerHTML = '';
                chatHandler.loadStoredMessages();
            }
        };

        // 소켓 메시지 수신
        socket.on('chatMessage', (data) => {
            chatHandler.displayMessage(data, chatHandler.getCurrentUser());
        });

        // 로그인 모달 이벤트
        elements.auth.loginText.addEventListener('click', () => {
            elements.auth.loginModal.style.display = 'block';
        });

        // 회원가입 ���크 클릭 이벤트
        elements.auth.registerLink.addEventListener('click', () => {
            elements.auth.loginModal.style.display = 'none';
            elements.auth.registerModal.style.display = 'block';
        });

        // 모달 닫기 버튼 이벤트
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                elements.auth.loginModal.style.display = 'none';
                elements.auth.registerModal.style.display = 'none';
            });
        });

        // 모달 외부 클릭시 닫기
        window.addEventListener('click', (e) => {
            if (e.target === elements.auth.loginModal) {
                elements.auth.loginModal.style.display = 'none';
            }
            if (e.target === elements.auth.registerModal) {
                elements.auth.registerModal.style.display = 'none';
            }
        });

        // 회원가입 폼 제출 처리
        elements.auth.registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                username: document.getElementById('regUsername').value,
                password: document.getElementById('regPassword').value
            };

            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();

                if (result.success) {
                    alert('회원가입이 완료되었습니다!');
                    elements.auth.registerModal.style.display = 'none';
                    elements.auth.loginModal.style.display = 'block';
                } else {
                    alert(result.message || '회원가입에 실패했습니다.');
                }
            } catch (error) {
                console.error('회원가입 에러:', error);
                alert('회원가입 처리 중 오류가 발생했습니다.');
            }
        });

        // 로그인 폼 제출 처리
        elements.auth.loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = {
                username: document.getElementById('username').value,
                password: document.getElementById('password').value
            };

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData),
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();

                if (result.success) {
                    elements.auth.loginModal.style.display = 'none';
                    elements.auth.loginText.style.display = 'none';
                    elements.auth.userInfo.style.display = 'block';
                    elements.auth.welcomeMessage.textContent = `환영합니다, ${formData.username}님!`;
                    
                    // Socket.IO 재연결
                    socket.disconnect();
                    socket.connect();
                    
                    chatHandler.loadStoredMessages();
                } else {
                    alert(result.message || '로그인에 실패했습니다.');
                }
            } catch (error) {
                console.error('로그인 에러:', error);
                alert('로그인 처리 중 오류가 발생했습니다.');
            }
        });
    };

    // 초기화 함수
    const initialize = () => {
        setupEventListeners();
        chatHandler.loadStoredMessages();
        timetableHandler.updateCurrentPeriod();
        
        // 1분마다 현재 교시 업데이트
        setInterval(timetableHandler.updateCurrentPeriod, 60000);
    };

    // 애플리케이션 시작
    initialize();
});
