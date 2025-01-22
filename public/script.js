const timeText = document.getElementById('timeText');
const websiteList = document.getElementById('website-list');
const classroomLink = document.getElementById('classroom-link');
const padletLink = document.getElementById('padlet-link');
const driveLink = document.getElementById('drive-link');
const websiteForm = document.getElementById('website-form');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const Colors = ["#FFB6C1", "#FFA07A", "#FFFF99", "#98FB98", "#87CEEB", "#B0C4DE", "#DDA0DD"];
const socket = io();

function updateTimeText() {
    now = new Date();
    if (now.getDay() == 0 || now.getDay() == 6) {
        timeText.innerText = "오늘은 학교에 가지 않는 날입니다.";
    } else {
        checkPeriod(now);
    }
}

function checkPeriod(now) {
    if (now.getHours() === 9 && now.getMinutes() <= 40) {
        timeText.innerText = "1교시 입니다.";
    }  else if (now.getHours() == 9 && now.getMinutes() >= 50 || now.getHours() == 10 && now.getMinutes() <= 30) {
        timeText.innerText = "2교시 입니다.";
    } else if (now.getHours() == 10 && now.getMinutes() >= 40 || now.getHours() == 11 && now.getMinutes() <= 20) {
        timeText.innerText = "3교시 입니다.";
    } else if (now.getHours() == 11 && now.getMinutes() >= 30 || now.getHours() == 12 && now.getMinutes() <= 10) {
        timeText.innerText = "4교시 입니다.";
    } else if (now.getHours() == 12 && now.getMinutes() > 10 || now.getHours() == 12) {
        timeText.innerText = "점심시간 입니다.";
    } else if (now.getHours() == 13 && now.getMinutes() < 40) {
        timeText.innerText = "5교시 입니다.";
    } else if ((now.getHours() == 13 && now.getMinutes() >= 50) || 
             (now.getHours() == 14 && now.getMinutes() <= 30)) {
        timeText.innerText = "6교시 입니다.";
    } else if (now.getHours() == 14 && now.getMinutes() >= 30 || now.getHours() == 15 && now.getMinutes() <= 10) {
        timeText.innerText = "7교시 입니다.";
    } else if (now.getHours() >= 15 && now.getMinutes() > 10) {
        timeText.innerText = "오늘의 수업이 종료되었습니다.";
    } else if (now.getHours() < 9) {
        timeText.innerText = "오늘의 수업이 시작되지 않았습니다.";
    } else {
        timeText.innerText = "쉬는 시간 입니다.";
    }
}

function linkRainbow(link, colors) {
    let colorIndex = 0;
    let intervalId = null;
    
    function changeColor() {
        link.style.color = colors[colorIndex];
        colorIndex = (colorIndex + 1) % colors.length;
    }

    link.addEventListener('mouseenter', () => {
        if (!intervalId) {
            intervalId = setInterval(changeColor, 100);
        }
    });

    link.addEventListener('mouseleave', () => {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
        link.style.color = '';
    });
}

function addWebsite(siteName, siteUrl) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = siteUrl;
    a.textContent = siteName;
    a.target = "_blank";
    a.rel = "noopener";
    li.appendChild(a);
    websiteList.appendChild(li);
}

function applyRainbowToLinks() {
    const websiteLinkList = websiteList.querySelectorAll('a');
    for (let i = 0; i < websiteLinkList.length; i++) {
        linkRainbow(websiteLinkList[i], Colors);
    }
}

websiteForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const nameInput = document.getElementById('website-name');
    const urlInput = document.getElementById('website-url');
    
    saveWebsite(nameInput.value, urlInput.value);
    addWebsite(nameInput.value, urlInput.value);
    
    websiteForm.reset();
    applyRainbowToLinks();
});

async function saveWebsite(siteName, siteUrl) {
    try {
        const response = await fetch('/api/websites', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: siteName, url: siteUrl })
        });
        
        if (!response.ok) {
            throw new Error('웹사이트 저장에 실패했습니다.');
        }
    } catch (error) {
        console.error('저장 오류:', error);
        alert('웹사이트를 저장하는 중 오류가 발생했습니다.');
    }
}

async function loadWebsites() {   
    try {
        const response = await fetch('/api/websites');
        if (!response.ok) {
            throw new Error('웹사이트 목록을 불러오는데 실패했습니다.');
        }
        
        const websites = await response.json();
        // 기존 목록 초기화
        websiteList.innerHTML = '';
        // 새로운 데이터로 목록 갱신
        websites.forEach(website => {
            addWebsite(website.name, website.url);
        });
        // 링크에 레인보우 효과 적용
        applyRainbowToLinks();
    } catch (error) {
        console.error('로딩 오류:', error);
    }
}

function checkForUpdates() {
    try {
        loadWebsites();
    } catch (error) {
        console.error('업데이트 확인 중 오류 발생:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    linkRainbow(classroomLink, Colors);
    linkRainbow(padletLink, Colors);
    linkRainbow(driveLink, Colors);
    loadWebsites();  // 초기 데이터 로드
});

// 채팅 기능 수정
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = chatInput.value;
    if (message.trim() !== '') {
        // 소켓을 통해 메시지 전송
        socket.emit('chat message', message);
        chatInput.value = '';
    }
});

// 메시지 수신 처리
socket.on('chat message', (msg) => {
    const messagesBox = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.textContent = msg;
    messageElement.className = 'message';
    messagesBox.appendChild(messageElement);
    messagesBox.scrollTop = messagesBox.scrollHeight;
});

// 연결 상태 확인용 (선택사항)
socket.on('connect', () => {
    console.log('서버에 연결되었습니다.');
});

socket.on('disconnect', () => {
    console.log('서버와 연결이 끊어졌습니다.');
});

setInterval(() => {
    updateTimeText();
    checkForUpdates();
}, 1000);
