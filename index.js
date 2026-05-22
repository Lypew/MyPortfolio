document.addEventListener("DOMContentLoaded", () => {
    /* ==========================================
       1. 네비게이션 및 모바일 햄버거 메뉴
       ========================================== */
    const hamburger = document.querySelector(".hamburger");
    const navMenu = document.querySelector(".nav-menu");
    const icon = document.querySelector('.icon');

    const toggleMenu = () => {
        hamburger.classList.toggle("active");
        navMenu.classList.toggle("active");
        if (icon) icon.classList.toggle("open");
    };

    if (icon) icon.addEventListener('click', () => icon.classList.toggle("open"));
    hamburger.addEventListener("click", toggleMenu);

    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", () => {
            hamburger.classList.remove("active");
            navMenu.classList.remove("active");
            if (icon) icon.classList.remove("open");
        });
    });

    /* ==========================================
       2. 다크 모드 (LocalStorage 최적화)
       ========================================== */
    const darkModeToggle = document.querySelector('.lightswitch');
    
    const enableDarkMode = () => {
        document.body.classList.add('dark__mode');
        localStorage.setItem('darkMode', 'enabled');
        darkModeToggle.src = 'assets/sun.svg';
    };

    const disableDarkMode = () => {
        document.body.classList.remove('dark__mode');
        localStorage.setItem('darkMode', 'disabled'); // 문자열 null 대신 명시적 값 설정
        darkModeToggle.src = 'assets/moon.svg';
    };

    // 초기 상태 체크
    if (localStorage.getItem('darkMode') === 'enabled') {
        enableDarkMode();
    }

    darkModeToggle.addEventListener('click', () => {
        localStorage.getItem('darkMode') !== 'enabled' ? enableDarkMode() : disableDarkMode();
    });

    /* ==========================================
    3. AI 챗봇 인터랙션 (Gemini API 연동 버전)
    ========================================== */
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatTrigger = document.querySelector('.chat-trigger-btn');
    const chatClose = document.querySelector('.chat-close-btn');
    const chatWidgetContainer = document.getElementById('chatWidgetContainer');
    const chatBox = document.getElementById('chatBox');

    const toggleChatWidget = () => chatWidgetContainer.classList.toggle('open');
    if (chatTrigger) chatTrigger.addEventListener('click', toggleChatWidget);
    if (chatClose) chatClose.addEventListener('click', toggleChatWidget);

    // ✨ 마크다운 변환 처리가 추가된 메시지 출력 함수
    const appendMessage = (text, className) => {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', className);
        
        // 🔥 [핵심 수정 포인트] 봇이 보낸 메시지일 때만 마크다운을 HTML로 변환하여 주입합니다.
        if (className === 'bot-message' && typeof marked !== 'undefined') {
            messageDiv.innerHTML = marked.parse(text);
        } else {
            // 유저 메시지는 스크립트 주입 공격(XSS)을 막기 위해 안전하게 textContent를 유지합니다.
            messageDiv.textContent = text;
        }
        
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    };

    // 💡 백엔드 서버리스 함수와 통신하여 AI 답변을 받아오는 핵심 함수
    const sendMessage = async () => {
        const messageText = chatInput.value.trim();
        if (!messageText) return;

        // 1. 유저 메시지 화면에 출력 및 입력창 초기화
        appendMessage(messageText, 'user-message');
        chatInput.value = '';

        // 2. AI가 생각 중일 때 띄워줄 임시 말풍선 (로딩 텍스트) 생성
        const loadingDiv = document.createElement('div');
        loadingDiv.classList.add('message', 'bot-message');
        loadingDiv.textContent = '답변을 생각하고 있습니다... 🤖';
        chatBox.appendChild(loadingDiv);
        chatBox.scrollTop = chatBox.scrollHeight;

        try {
            // ✨ 수정 후: 내 컴퓨터 로컬 파이썬 RAG API 주소로 전격 변경!
            const response = await fetch('http://localhost:5000/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: messageText })
            });

            const data = await response.json();
            
            // 로딩 메시지 제거
            chatBox.removeChild(loadingDiv);

            if (response.ok) {
                // 4. 성공 시 실제 AI 답변 출력 (appendMessage 내부에서 마크다운을 알아서 파싱합니다)
                appendMessage(data.reply, 'bot-message');
            } else {
                appendMessage('죄송합니다. 답변을 불러오는 중에 문제가 발생했습니다.', 'bot-message');
            }
        } catch (error) {
            console.error(error);
            chatBox.removeChild(loadingDiv);
            appendMessage('서버와 연결이 원활하지 않습니다.', 'bot-message');
        }
    };

    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    /* ==========================================
       4. 방명록 게시판 (보안 강화 및 이벤트 위임 적용)
       ========================================== */
    const boardContainer = document.getElementById('boardContainer');
    const boardSubmitBtn = document.querySelector('.board-submit-btn');

    let posts = JSON.parse(localStorage.getItem('portfolio_posts')) || [
        { 
            id: 1, 
            type: 'peer', 
            author: '안민재', 
            content: '글을 쓰거나 삭제할수 있습니다!', 
            date: '2026.05.22' 
        }
    ];

    // XSS 방지용 단순 텍스트 치환 함수 (안전한 HTML 삽입을 위함)
    const escapeHtml = (str) => {
        return str.replace(/[&<>"']/g, (match) => {
            const escapes = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
            return escapes[match];
        });
    };

    const renderPosts = () => {
        if (!boardContainer) return;
        boardContainer.innerHTML = '';

        posts.forEach(post => {
            const item = document.createElement('div');
            item.classList.add('board-item');
            
            let typeTxt = '방문자';
            if (post.type === 'peer') typeTxt = '동료';
            if (post.type === 'client') typeTxt = '클라이언트';

            // 입력 데이터(author, content) 부분에 escapeHtml을 씌워 스크립트 주입을 원천 차단합니다.
            item.innerHTML = `
                <div class="board-meta">
                    <span class="board-badge ${post.type}">${typeTxt}</span>
                    <strong class="board-author">${escapeHtml(post.author)}</strong>
                    <span class="board-date">${post.date}</span>
                    <button class="board-delete-btn" data-id="${post.id}" title="삭제">❌</button>
                </div>
                <p class="board-content">${escapeHtml(post.content)}</p>
            `;
            boardContainer.appendChild(item);
        });
    };

    const addPost = () => {
        const authorInput = document.getElementById('boardAuthor');
        const typeInput = document.getElementById('boardType');
        const contentInput = document.getElementById('boardContent');

        const author = authorInput.value.trim();
        const type = typeInput.value;
        const content = contentInput.value.trim();

        if (!author || !content) {
            alert('이름과 내용을 모두 입력해 주세요!');
            return;
        }

        const now = new Date();
        const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

        const newPost = { id: Date.now(), type, author, content, date: dateStr };

        posts.unshift(newPost);
        localStorage.setItem('portfolio_posts', JSON.stringify(posts));
        renderPosts();

        authorInput.value = '';
        contentInput.value = '';
    };

    // 💡 이벤트 위임 적용: 개별 버튼이 아닌 컨테이너에서 클릭을 감지하여 삭제 처리
    if (boardContainer) {
        boardContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('board-delete-btn')) {
                const postId = Number(e.target.dataset.id);
                if (confirm('이 방명록 글을 정말 삭제하시겠습니까?')) {
                    posts = posts.filter(post => post.id !== postId);
                    localStorage.setItem('portfolio_posts', JSON.stringify(posts));
                    renderPosts();
                }
            }
        });
    }

    if (boardSubmitBtn) boardSubmitBtn.addEventListener('click', addPost);

    // 최초 렌더링
    renderPosts();
});