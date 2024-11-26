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
        },
        studyHelper: {
            newQuestionBtn: document.getElementById('newQuestionBtn'),
            newNoticeBtn: document.getElementById('newNoticeBtn'),
            postModal: document.getElementById('postModal'),
            postForm: document.getElementById('postForm'),
            postsList: document.getElementById('postsList'),
            filterBtns: document.querySelectorAll('.filter-btn')
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
                elements.timetable.currentPeriod.textContent = '현재 수업 시간이 아닙니다.';
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

        // 회원가입 크 클릭 이벤트
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

        // 선생님 체크박스 이벤트 처리
        document.getElementById('isTeacher').addEventListener('change', function(e) {
            const teacherCodeInput = document.getElementById('teacherCode');
            teacherCodeInput.style.display = e.target.checked ? 'block' : 'none';
            teacherCodeInput.required = e.target.checked;
        });

        // 회원가입 폼 제출 처리
        elements.auth.registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('regUsername').value;
            const password = document.getElementById('regPassword').value;
            const isTeacher = document.getElementById('isTeacher').checked;
            const teacherCode = isTeacher ? document.getElementById('teacherCode').value : null;

            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username,
                        password,
                        teacherCode
                    })
                });

                const data = await response.json();
                
                if (response.ok) {
                    // 로그인 성공 처리
                    updateUIForLoggedInUser(data.user);
                    closeModal(elements.auth.registerModal);
                    alert('회원가입이 완료되었습니다!');
                } else {
                    // 에러 메시지 표시
                    const errorMessage = document.getElementById('registerError');
                    if (errorMessage) {
                        errorMessage.textContent = data.error;
                        errorMessage.style.display = 'block';
                    } else {
                        alert(data.error);
                    }
                }
            } catch (err) {
                console.error('회원가입 오류:', err);
                alert('회원가입 중 오류가 발생했습니다.');
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
                    updateUIForLoggedInUser(result.user);
                    
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

        // 게시물 작성 버튼 이벤트
        elements.studyHelper.newQuestionBtn.addEventListener('click', () => {
            if (!checkLogin()) {
                alert('로그인이 필요합니다.');
                return;
            }
            openPostModal('question');
        });

        elements.studyHelper.newNoticeBtn.addEventListener('click', () => {
            if (!checkLogin()) {
                alert('로그인이 필요합니다.');
                return;
            }
            if (!isTeacher()) {
                alert('선생님만 공지를 작성할 수 있습니다.');
                return;
            }
            openPostModal('notice');
        });

        // 게시물 작성 폼 제출 이벤트
        elements.studyHelper.postForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('postTitle').value;
            const content = document.getElementById('postContent').value;
            const type = elements.studyHelper.postModal.dataset.postType;

            try {
                const response = await fetch('/api/posts', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ title, content, type })
                });

                if (response.ok) {
                    closePostModal();
                    loadPosts();
                    alert('게시물이 등록되었습니다.');
                } else {
                    const data = await response.json();
                    alert(data.error);
                }
            } catch (err) {
                console.error('게시물 등록 오류:', err);
                alert('게시물 등록 중 오류가 발생했습니다.');
            }
        });

        // 필터 버튼 이벤트
        elements.studyHelper.filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                elements.studyHelper.filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                loadPosts(btn.dataset.filter);
            });
        });

        // 헬퍼 함수들
        function checkLogin() {
            return !!document.querySelector('#userInfo').dataset.username;
        }

        function isTeacher() {
            return document.querySelector('#userInfo').dataset.isTeacher === 'true';
        }

        function openPostModal(type) {
            elements.studyHelper.postModal.dataset.postType = type;
            elements.studyHelper.postModal.style.display = 'block';
            document.getElementById('modalTitle').textContent = 
                type === 'question' ? '질문하기' : '공지사항 작성';
        }

        function closePostModal() {
            elements.studyHelper.postModal.style.display = 'none';
            elements.studyHelper.postForm.reset();
        }

        async function loadPosts(filter = 'all') {
            try {
                const response = await fetch(`/api/posts?filter=${filter}`);
                const posts = await response.json();
                displayPosts(posts);
            } catch (err) {
                console.error('게시물 로드 오류:', err);
            }
        }

        function displayPosts(posts) {
            const postsList = elements.studyHelper.postsList;
            postsList.innerHTML = posts.map(post => `
                <div class="post-item">
                    <div class="post-header">
                        <span class="post-type ${post.type}">${post.type === 'question' ? '질문' : '공지'}</span>
                        <span class="post-date">${new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                    <h3 class="post-title">${post.title}</h3>
                    <div class="post-content">${post.content}</div>
                    <div class="post-footer">
                        <span class="post-author">${post.author}</span>
                    </div>
                    <div class="comments-section">
                        <div class="comments-list" id="comments-${post.id}"></div>
                        ${checkLogin() ? `
                            <form class="comment-form" onsubmit="submitComment(event, ${post.id})">
                                <textarea placeholder="댓글을 입력하세요" required></textarea>
                                <button type="submit">댓글 작성</button>
                            </form>
                        ` : '<p>댓글을 작성하려면 로그인이 필요합니다.</p>'}
                    </div>
                </div>
            `).join('');
            
            // 각 게시물의 댓글 로드
            posts.forEach(post => loadComments(post.id));
        }

        async function loadComments(postId) {
            try {
                const response = await fetch(`/api/posts/${postId}/comments`);
                const comments = await response.json();
                displayComments(postId, comments);
            } catch (err) {
                console.error('댓글 로드 오류:', err);
            }
        }

        function displayComments(postId, comments) {
            const commentsList = document.getElementById(`comments-${postId}`);
            commentsList.innerHTML = comments.map(comment => `
                <div class="comment ${comment.is_accepted ? 'accepted' : ''}" data-comment-id="${comment.id}">
                    <div class="comment-content">${comment.content}</div>
                    <div class="comment-footer">
                        <span class="comment-author">${comment.author}</span>
                        <span class="comment-date">${new Date(comment.created_at).toLocaleDateString()}</span>
                        ${comment.is_accepted ? 
                            `<span class="accepted-badge">채택됨 (by ${comment.accepted_by}${comment.accepted_by_teacher ? ' 선생님' : ''})</span>` 
                            : checkAcceptPermission(postId, comment.author) ? 
                                `<button onclick="acceptComment(${comment.id}, ${postId})">채택하기</button>` 
                                : ''
                        }
                    </div>
                </div>
            `).join('');
        }

        function checkAcceptPermission(postId, commentAuthor) {
            const userInfo = document.querySelector('#userInfo');
            const isTeacher = userInfo.dataset.isTeacher === 'true';
            const isAuthor = userInfo.dataset.username === commentAuthor;
            return isTeacher || isAuthor;
        }

        async function acceptComment(commentId, postId) {
            try {
                const response = await fetch(`/api/comments/${commentId}/accept`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ postId })
                });

                if (response.ok) {
                    loadComments(postId);
                } else {
                    const data = await response.json();
                    alert(data.error);
                }
            } catch (err) {
                console.error('댓글 채택 오류:', err);
                alert('댓글 채택 중 오류가 발생했습니다.');
            }
        }

        async function submitComment(event, postId) {
            event.preventDefault();
            const form = event.target;
            const content = form.querySelector('textarea').value;

            try {
                const response = await fetch('/api/comments', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ postId, content })
                });

                if (response.ok) {
                    form.reset();
                    loadComments(postId);
                } else {
                    const data = await response.json();
                    alert(data.error);
                }
            } catch (err) {
                console.error('댓글 작성 오류:', err);
                alert('댓글 작성 중 오류가 발생했습니다.');
            }
        }

        // 여기에 모달 닫기 이벤트 추가
        document.querySelector('#postModal .close').addEventListener('click', () => {
            closePostModal();
        });

        // 초기 게시물 로드
        loadPosts();
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

// updateUIForLoggedInUser 함수 추가
function updateUIForLoggedInUser(user) {
    elements.auth.loginText.style.display = 'none';
    elements.auth.userInfo.style.display = 'block';
    elements.auth.welcomeMessage.textContent = `환영합니다, ${user.username}님!`;
    elements.auth.userInfo.dataset.username = user.username;
    elements.auth.userInfo.dataset.isTeacher = user.isTeacher;
}
