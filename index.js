document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 index.js 가 성공적으로 로드되었습니다.");

    /* ==========================================
       1. 네비게이션 및 모바일 햄버거 메뉴
       ========================================== */
    const hamburger = document.querySelector(".hamburger");
    const navMenu = document.querySelector(".nav-menu");
    const icon = document.querySelector('.icon');

    const toggleMenu = () => {
        if (hamburger) hamburger.classList.toggle("active");
        if (navMenu) navMenu.classList.toggle("active");
        if (icon) icon.classList.toggle("open");
    };

    if (hamburger) {
        hamburger.addEventListener("click", toggleMenu);
    }

    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", () => {
            hamburger?.classList.remove("active");
            navMenu?.classList.remove("active");
            if (icon) icon.classList.remove("open");
        });
    });


    /* ==========================================
       2. 다크 모드
       ========================================== */
    const darkModeToggle = document.querySelector('.lightswitch');

    const enableDarkMode = () => {
        document.body.classList.add('dark__mode');
        localStorage.setItem('darkMode', 'enabled');
        if (darkModeToggle) darkModeToggle.src = 'assets/sun.svg';
    };

    const disableDarkMode = () => {
        document.body.classList.remove('dark__mode');
        localStorage.setItem('darkMode', 'disabled');
        if (darkModeToggle) darkModeToggle.src = 'assets/moon.svg';
    };

    if (localStorage.getItem('darkMode') === 'enabled') {
        enableDarkMode();
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            localStorage.getItem('darkMode') !== 'enabled'
                ? enableDarkMode()
                : disableDarkMode();
        });
    }


    /* ==========================================
       3. AI 챗봇 인터랙션 (로컬 Flask → Gemini Fallback)
       ========================================== */
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatTrigger = document.querySelector('.chat-trigger-btn');
    const chatClose = document.querySelector('.chat-close-btn');
    const chatWidgetContainer = document.getElementById('chatWidgetContainer');
    const chatBox = document.getElementById('chatBox');

    // 💾 채팅 캐시 키
    const CHAT_CACHE_KEY = "chat_cache";

    // 🤖 채팅창 열기/닫기 토글 함수 (안전성 강화)
    const toggleChatWidget = (e) => {
        if (e) e.stopPropagation(); // 이벤트 전파 차단
        if (chatWidgetContainer) {
            chatWidgetContainer.classList.toggle('open');
            console.log("🤖 채팅창 토글 상태:", chatWidgetContainer.classList.contains('open') ? "열림" : "닫힘");
        } else {
            console.error("❌ 오류: #chatWidgetContainer 요소를 HTML에서 찾을 수 없습니다.");
        }
    };

    // 클릭 이벤트 리스너 안전하게 바인딩
    if (chatTrigger) {
        chatTrigger.addEventListener('click', toggleChatWidget);
        console.log("✅ 채팅 열기 버튼(.chat-trigger-btn) 이벤트 바인딩 성공");
    } else {
        console.warn("⚠️ 경고: .chat-trigger-btn 버튼이 HTML에 존재하지 않습니다.");
    }

    if (chatClose) {
        chatClose.addEventListener('click', toggleChatWidget);
        console.log("✅ 채팅 닫기 버튼(.chat-close-btn) 이벤트 바인딩 성공");
    } else {
        console.warn("⚠️ 경고: .chat-close-btn 버튼이 HTML에 존재하지 않습니다.");
    }

    // 메시지 화면 출력 함수
    const appendMessage = (text, className) => {
        if (!chatBox) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', className);

        // 봇 메시지 마크다운 처리
        if (className === 'bot-message' && typeof marked !== 'undefined') {
            messageDiv.innerHTML = marked.parse(text);
        } else {
            messageDiv.textContent = text;
        }

        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    };

    // 💾 로컬 캐시 함수들
    const saveChatCache = (question, answer) => {
        const cacheData = { question, answer, timestamp: Date.now() };
        localStorage.setItem(CHAT_CACHE_KEY, JSON.stringify(cacheData));
    };

    const getChatCache = (question) => {
        try {
            const cache = localStorage.getItem(CHAT_CACHE_KEY);
            if (!cache) return null;
            const parsed = JSON.parse(cache);
            if (parsed.question === question) {
                console.log("✅ 캐시 일치 데이터 발견하여 즉시 반환");
                return parsed.answer;
            }
            return null;
        } catch (error) {
            console.error("❌ 캐시 파싱 에러:", error);
            return null;
        }
    };

    // 🚀 메시지 전송 (환경변수 기반 백엔드 일원화 구조)
    const sendMessage = async () => {
        if (!chatInput || !chatBox) return;

        const messageText = chatInput.value.trim();
        if (!messageText) return;

        // 1. 유저 인터페이스 메시지 추가
        appendMessage(messageText, 'user-message');
        chatInput.value = '';

        // 2. 동일 질문 로컬 캐시 검증
        const cachedAnswer = getChatCache(messageText);
        if (cachedAnswer) {
            appendMessage(cachedAnswer, 'bot-message');
            return;
        }

        // 3. 로딩 상태 말풍선 생성
        const loadingDiv = document.createElement('div');
        loadingDiv.classList.add('message', 'bot-message');
        loadingDiv.textContent = '답변을 생각하고 있습니다... 🤖';
        chatBox.appendChild(loadingDiv);
        chatBox.scrollTop = chatBox.scrollHeight;

        /* =======================================================
           🔄 하이브리드 파이프라인 연동
           - 로컬 컴 테스트 시: http://localhost:5000/api/chat 호출 (Ollama 실행 -> 실패 시 Gemini 우회)
           - Vercel 배포 시: 로컬 주소가 차단되므로 catch 블록의 '/api/chat' 서버리스 프록시가 작동
           ======================================================= */
        try {
            console.log("🖥️ [1단계] 로컬 Flask 백엔드 시스템에 접근합니다...");
            const localResponse = await fetch('http://localhost:5000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: messageText })
            });

            if (!localResponse.ok) throw new Error("로컬 백엔드 상태 이상");

            const localData = await localResponse.json();
            if (loadingDiv.parentNode) chatBox.removeChild(loadingDiv);
            appendMessage(localData.reply, 'bot-message');
            saveChatCache(messageText, localData.reply);
            return;

        } catch (localError) {
            console.warn("⚠️ 로컬 서버 통신 불가 -> [2단계] 원격 실배포 API 채널로 포워딩합니다.");
            
            try {
                // 이미 제공해주신 api/chat.js (Vercel 환경변수 process.env.GEMINI_API_KEY 작동 영역) 호출
                const productionResponse = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: messageText })
                });

                if (!productionResponse.ok) throw new Error("원격 배포 서버 응답 실패");

                const prodData = await productionResponse.json();
                if (loadingDiv.parentNode) chatBox.removeChild(loadingDiv);
                appendMessage(prodData.reply, 'bot-message');
                saveChatCache(messageText, prodData.reply);

            } catch (prodError) {
                console.error("❌ 최종 예외: 모든 인공지능 엔드포인트 도달 실패", prodError);
                if (loadingDiv.parentNode) chatBox.removeChild(loadingDiv);
                appendMessage(`❌ 서버 연결 실패\n\n현재 로컬 인공지능 백엔드가 꺼져 있거나 배포 환경변수가 설정되지 않았습니다.`, 'bot-message');
            }
        }
    };

    // 전송 버튼 결합
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }

    // 한글 조립 중 복사 버그 방지 엔터 키 바인딩
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.isComposing) return; // IME 입력 완료 전 이벤트 중단
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }


    /* ==========================================
       4. 방명록 게시판
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

        if (!authorInput || !contentInput || !typeInput) return;

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

    if (boardSubmitBtn) {
        boardSubmitBtn.addEventListener('click', addPost);
    }

    // 첫 실행 렌더링
    renderPosts();
});