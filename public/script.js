document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('siteForm');
    const output = document.getElementById('output');
    const addSiteButton = document.getElementById('addSiteButton');
    const popup = document.getElementById('popup');
    const closePopup = document.getElementById('closePopup');
    const popupForm = document.getElementById('popupForm');
    const teacherSites = document.getElementById('teacherSites');
    const loginPopup = document.getElementById('loginPopup');
    const loginForm = document.getElementById('loginForm');
    const closeLoginPopup = document.getElementById('closeLoginPopup');
    
    form.addEventListener('submit', function(event) {
        event.preventDefault(); // 폼의 기본 제출 동작을 막습니다.
        
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
            displayStoredData(); // 데이터를 저장한 후 저장된 데이터를 표시
        });
        
        // 필요시 폼 필드 초기화
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

    addSiteButton.addEventListener('click', function() {
        loginPopup.style.display = 'block';
    });

    closeLoginPopup.addEventListener('click', function() {
        loginPopup.style.display = 'none';
    });

    loginForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // 서버로 로그인 정보 전송
        fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loginPopup.style.display = 'none';
                popup.style.display = 'block';
            } else {
                alert('로그인 실패: 잘못된 사용자 이름 또는 비밀번호입니다.');
            }
        });
    });

    closePopup.addEventListener('click', function() {
        popup.style.display = 'none';
    });

    popupForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const siteName = document.getElementById('siteName').value;
        const siteUrl = document.getElementById('siteUrl').value;
        fetch('/submitTeacherSite', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: siteName, url: siteUrl })
        })
        .then(response => response.text())
        .then(data => {
            alert(data);
            displayTeacherSites();
        });
        popup.style.display = 'none';
        popupForm.reset();
    });

    function displayTeacherSites() {
        fetch('/teacherSites')
        .then(response => response.json())
        .then(sites => {
            teacherSites.innerHTML = '';
            sites.forEach(site => {
                teacherSites.innerHTML += `<li>${site.name} - <a href="${site.url}" target="_blank">${site.url}</a></li>`;
            });
        });
    }

    displayTeacherSites();
});
