document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('siteForm');
    const output = document.getElementById('output');

    // 사이트 정보 제출
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

    // 교시 정보
    const periods = [
        { start: "09:00", end: "09:40", period: "1교시" },
        { start: "09:50", end: "10:30", period: "2교시" },
        { start: "10:40", end: "11:20", period: "3교시" },
        { start: "11:30", end: "12:10", period: "4교시" },
        { start: "13:00", end: "13:40", period: "5교시" },
        { start: "13:50", end: "14:30", period: "6교시" },
        { start: "14:30", end: "15:10", period: "7교시" }
    ];

    function updateCurrentPeriod() {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        const currentPeriodElement = document.getElementById('currentPeriod');
        const dayOfWeek = now.getDay(); // 일요일(0)부터 토요일(6)까지 반환
        let currentPeriod = "";
        let currentClass = "";

        // 주말인 경우 메시지 표시
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            currentPeriod = "오늘은 수업이 없습니다!";
        } else {
            // 평일인 경우 시간에 따라 메시지 표시
            let isPeriodFound = false;
            for (const period of periods) {
                if (currentTime >= period.start && currentTime < period.end) {
                    currentPeriod = `지금은 ${period.period}입니다!`;
                    currentClass = period.period;  // 현재 교시 기록
                    isPeriodFound = true;
                    break;
                }
            }
            // 수업 시간이 모두 끝난 경우 메시지
            if (!isPeriodFound) {
                if (currentTime < periods[0].start) {
                    currentPeriod = "수업이 아직 시작되지 않았습니다.";
                } else if (currentTime >= periods[periods.length - 1].end) {
                    currentPeriod = "오늘 수업이 모두 끝났습니다!";
                } else {
                    currentPeriod = "쉬는 시간입니다!"; // 쉬는 시간
                }
            }
        }

        currentPeriodElement.textContent = `현재 시각: ${currentTime} - ${currentPeriod}`;
    }

    // 페이지 로드 시와 매 분마다 현재 교시 업데이트
    updateCurrentPeriod();
    setInterval(updateCurrentPeriod, 60000); // 1분마다 업데이트
});
