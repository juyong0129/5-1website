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

    // 이벤트 리스너 설정
    const setupEventListeners = () => {
        // 채팅 메시지 전송
        elements.chat.form.addEventListener('submit', (e) => {
            e.preventDefault();
            const message = elements.chat.input.value.trim();
            const username = chatHandler.getCurrentUser();

            if (message && username) {
                socket.emit('chatMessage', { username, message });
                elements.chat.input.value = '';
            } else if (!username) {
                alert('채팅을 하려면 먼저 로그인해주세요!');
                elements.auth.loginText.classList.add('highlight-animation');
                setTimeout(() => {
                    elements.auth.loginText.classList.remove('highlight-animation');
                }, 2000);
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

        // 회원가입 링크 클릭 이벤트
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
            const formData = new FormData(e.target);
            const data = {
                username: formData.get('username'),
                password: formData.get('password')
            };

            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

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
    };

    // 초기화 함수
    const initialize = () => {
        setupEventListeners();
        chatHandler.loadStoredMessages();
    };

    // 애플리케이션 시작
    initialize();
});
