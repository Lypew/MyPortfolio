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

        if (icon) {
            icon.classList.toggle("open");
        }
    };

    if (icon) {
        icon.addEventListener('click', () => {
            icon.classList.toggle("open");
        });
    }

    if (hamburger) {
        hamburger.addEventListener("click", toggleMenu);
    }

    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", () => {
            hamburger?.classList.remove("active");
            navMenu?.classList.remove("active");

            if (icon) {
                icon.classList.remove("open");
            }
        });
    });


    /* ==========================================
       2. 다크 모드
       ========================================== */
    const darkModeToggle = document.querySelector('.lightswitch');

    const enableDarkMode = () => {
        document.body.classList.add('dark__mode');
        localStorage.setItem('darkMode', 'enabled');

        if (darkModeToggle) {
            darkModeToggle.src = 'assets/sun.svg';
        }
    };

    const disableDarkMode = () => {
        document.body.classList.remove('dark__mode');
        localStorage.setItem('darkMode', 'disabled');

        if (darkModeToggle) {
            darkModeToggle.src = 'assets/moon.svg';
        }
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
       3. AI 챗봇 인터랙션
       로컬 → 온라인 → 에러 처리 구조
       ========================================== */

    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');

    const chatTrigger = document.querySelector('.chat-trigger-btn');
    const chatClose = document.querySelector('.chat-close-btn');

    const chatWidgetContainer = document.getElementById('chatWidgetContainer');
    const chatBox = document.getElementById('chatBox');

    // 💾 채팅 캐시 키
    const CHAT_CACHE_KEY = "chat_cache";

    const toggleChatWidget = () => {
        chatWidgetContainer?.classList.toggle('open');
    };

    if (chatTrigger) {
        chatTrigger.addEventListener('click', toggleChatWidget);
    }

    if (chatClose) {
        chatClose.addEventListener('click', toggleChatWidget);
    }

    // 메시지 출력
    const appendMessage = (text, className) => {

        const messageDiv = document.createElement('div');

        messageDiv.classList.add('message', className);

        // 봇 메시지 마크다운 처리
        if (
            className === 'bot-message' &&
            typeof marked !== 'undefined'
        ) {
            messageDiv.innerHTML = marked.parse(text);

        } else {
            messageDiv.textContent = text;
        }

        chatBox.appendChild(messageDiv);

        chatBox.scrollTop = chatBox.scrollHeight;
    };


    // 💾 로컬 캐시 저장
    const saveChatCache = (question, answer) => {

        const cacheData = {
            question,
            answer,
            timestamp: Date.now()
        };

        localStorage.setItem(
            CHAT_CACHE_KEY,
            JSON.stringify(cacheData)
        );
    };


    // 💾 로컬 캐시 가져오기
    const getChatCache = (question) => {

        try {

            const cache = localStorage.getItem(CHAT_CACHE_KEY);

            if (!cache) return null;

            const parsed = JSON.parse(cache);

            // 질문 동일할 때만 사용
            if (parsed.question === question) {

                console.log("✅ 로컬 캐시 사용");

                return parsed.answer;
            }

            return null;

        } catch (error) {

            console.error("❌ 캐시 읽기 실패:", error);

            return null;
        }
    };


    // 🚀 메시지 전송
    const sendMessage = async () => {

        const messageText = chatInput.value.trim();

        if (!messageText) return;

        appendMessage(messageText, 'user-message');

        chatInput.value = '';

        const loadingDiv = document.createElement('div');

        loadingDiv.classList.add('message', 'bot-message');

        loadingDiv.textContent =
            '답변을 생각하고 있습니다... 🤖';

        chatBox.appendChild(loadingDiv);

        chatBox.scrollTop = chatBox.scrollHeight;


        // 공통 요청 옵션
        const requestBody = {
            contents: [
                {
                    parts: [
                        {
                            text: messageText
                        }
                    ]
                }
            ]
        };


        /* ==========================================
        1️⃣ 로컬 Flask 서버 먼저 시도
        ========================================== */

        try {

            console.log("🖥️ 로컬 서버 시도");

            const localResponse = await fetch(
                'http://localhost:5000/api/chat',
                {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json'
                    },

                    body: JSON.stringify({
                        message: messageText
                    })
                }
            );

            if (!localResponse.ok) {
                throw new Error("로컬 서버 실패");
            }

            const localData =
                await localResponse.json();

            chatBox.removeChild(loadingDiv);

            appendMessage(
                localData.reply,
                'bot-message'
            );

            console.log("✅ 로컬 서버 응답 성공");

            return;

        } catch (localError) {

            console.warn(
                "⚠️ 로컬 실패 → Gemini API 시도",
                localError
            );
        }


        /* ==========================================
        2️⃣ Gemini API 직접 호출
        ========================================== */

        try {

            console.log("🌐 Gemini API 요청");

            const geminiResponse = await fetch(
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
                {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json',

                        'X-goog-api-key':
                            'YOUR_API_KEY'
                    },

                    body: JSON.stringify(requestBody)
                }
            );

            if (!geminiResponse.ok) {

                throw new Error(
                    `Gemini API 실패: ${geminiResponse.status}`
                );
            }

            const geminiData =
                await geminiResponse.json();

            const reply =
                geminiData?.candidates?.[0]?.content?.parts?.[0]?.text
                || "응답 생성 실패";

            chatBox.removeChild(loadingDiv);

            appendMessage(
                reply,
                'bot-message'
            );

            console.log("✅ Gemini API 응답 성공");

        } catch (geminiError) {

            console.error(
                "❌ Gemini API 실패",
                geminiError
            );

            chatBox.removeChild(loadingDiv);

            appendMessage(
                `
    ❌ 서버 연결 실패

    로컬 서버와 Gemini API
    모두 연결할 수 없습니다.
                `,
                'bot-message'
            );
        }
    };


    // 버튼 클릭
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }

    // 엔터 전송
    if (chatInput) {

        chatInput.addEventListener('keypress', (e) => {

            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }


    /* ==========================================
       4. 방명록 게시판
       ========================================== */

    const boardContainer =
        document.getElementById('boardContainer');

    const boardSubmitBtn =
        document.querySelector('.board-submit-btn');

    let posts =
        JSON.parse(
            localStorage.getItem('portfolio_posts')
        ) || [
            {
                id: 1,
                type: 'peer',
                author: '안민재',
                content: '글을 쓰거나 삭제할수 있습니다!',
                date: '2026.05.22'
            }
        ];


    // XSS 방지
    const escapeHtml = (str) => {

        return str.replace(
            /[&<>"']/g,
            (match) => {

                const escapes = {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;'
                };

                return escapes[match];
            }
        );
    };


    // 렌더링
    const renderPosts = () => {

        if (!boardContainer) return;

        boardContainer.innerHTML = '';

        posts.forEach(post => {

            const item =
                document.createElement('div');

            item.classList.add('board-item');

            let typeTxt = '방문자';

            if (post.type === 'peer') {
                typeTxt = '동료';
            }

            if (post.type === 'client') {
                typeTxt = '클라이언트';
            }

            item.innerHTML = `
                <div class="board-meta">
                    <span class="board-badge ${post.type}">
                        ${typeTxt}
                    </span>

                    <strong class="board-author">
                        ${escapeHtml(post.author)}
                    </strong>

                    <span class="board-date">
                        ${post.date}
                    </span>

                    <button
                        class="board-delete-btn"
                        data-id="${post.id}"
                        title="삭제"
                    >
                        ❌
                    </button>
                </div>

                <p class="board-content">
                    ${escapeHtml(post.content)}
                </p>
            `;

            boardContainer.appendChild(item);
        });
    };


    // 글 추가
    const addPost = () => {

        const authorInput =
            document.getElementById('boardAuthor');

        const typeInput =
            document.getElementById('boardType');

        const contentInput =
            document.getElementById('boardContent');

        const author =
            authorInput.value.trim();

        const type =
            typeInput.value;

        const content =
            contentInput.value.trim();

        if (!author || !content) {

            alert('이름과 내용을 모두 입력해 주세요!');

            return;
        }

        const now = new Date();

        const dateStr =
            `${now.getFullYear()}.` +
            `${String(now.getMonth() + 1).padStart(2, '0')}.` +
            `${String(now.getDate()).padStart(2, '0')}`;

        const newPost = {
            id: Date.now(),
            type,
            author,
            content,
            date: dateStr
        };

        posts.unshift(newPost);

        localStorage.setItem(
            'portfolio_posts',
            JSON.stringify(posts)
        );

        renderPosts();

        authorInput.value = '';
        contentInput.value = '';
    };


    // 삭제 이벤트
    if (boardContainer) {

        boardContainer.addEventListener('click', (e) => {

            if (
                e.target.classList.contains(
                    'board-delete-btn'
                )
            ) {

                const postId =
                    Number(e.target.dataset.id);

                if (
                    confirm(
                        '이 방명록 글을 정말 삭제하시겠습니까?'
                    )
                ) {

                    posts = posts.filter(
                        post => post.id !== postId
                    );

                    localStorage.setItem(
                        'portfolio_posts',
                        JSON.stringify(posts)
                    );

                    renderPosts();
                }
            }
        });
    }


    if (boardSubmitBtn) {
        boardSubmitBtn.addEventListener(
            'click',
            addPost
        );
    }

    // 최초 렌더링
    renderPosts();
});