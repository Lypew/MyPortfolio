# rag_test.py (검색 키워드 보완 및 검색 범위 확장 버전)
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.llms import Ollama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

app = Flask(__name__)
CORS(app)

rag_chain = None

def init_rag_system():
    global rag_chain
    print("🎯 [1/3] docs/profile.json 지식 문서 로드 및 완벽 동기화 중...")
    
    try:
        with open('./docs/profile.json', 'r', encoding='utf-8') as f:
            profile_data = json.load(f)
    except FileNotFoundError:
        print("❌ 에러: ./docs/profile.json 파일을 찾을 수 없습니다. 경로를 확인해주세요.")
        return

    raw_documents = []
    
    # 1. 프로필 정보 (안민재 개발자 키워드 포함)
    dev = profile_data["developer_info"]
    raw_documents.append(Document(page_content=f"안민재 개발자의 이름은 {dev['name']}입니다. 연락처는 {dev['phone']}이며, 이메일은 {dev['email']}입니다. 깃허브는 {dev['github']}입니다. 핵심 강점은 {dev['core_strength']}입니다."))
    
    # 2. 기능 정의서 명세 (✨ 검색 실패를 막기 위해 모든 문장에 '안민재 개발자'와 '기능 정의' 키워드를 명시합니다)
    specs = profile_data["web_features_specification"]
    raw_documents.append(Document(page_content=f"안민재 개발자의 포트폴리오 웹사이트 시스템 로그인 기능 정의서 (login_feature): {specs['login_feature']}"))
    raw_documents.append(Document(page_content=f"안민재 개발자의 포트폴리오 웹사이트 시스템 방명록 기능 정의서 (guestbook_feature): {specs['guestbook_feature']}"))
    raw_documents.append(Document(page_content=f"안민재 개발자의 포트폴리오 웹사이트 시스템 AI 챗봇 기능 정의서 (ai_chatbot_feature): {specs['ai_chatbot_feature']}"))
        
    # 3. 프로젝트 및 트러블슈팅
    proj = profile_data["main_project"]
    raw_documents.append(Document(page_content=f"안민재 개발자의 주요 개발 프로젝트는 '{proj['title']}'입니다. 개요는 '{proj['description']}'이며 기술 스택은 {proj['tech_stack']}입니다."))
    
    for case in proj["troubleshooting_cases"]:
        raw_documents.append(Document(
            page_content=f"안민재 개발자의 프로젝트 '{proj['title']}' 디버깅 및 트러블슈팅 사례 명세서: 문제점은 '{case['issue']}'였고, 해결책은 '{case['solution']}'이었습니다."
        ))

    # 데이터가 소량이므로 청크를 넉넉하게 잡고 온전히 보존합니다.
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    split_docs = text_splitter.split_documents(raw_documents)
    
    embeddings = OllamaEmbeddings(model="gemma2:2b")
    vector_store = InMemoryVectorStore.from_documents(split_docs, embeddings)
    
    # ✨ [핵심 수정] k값을 6으로 늘려 지식 베이스의 거의 모든 문장을 AI에게 한 번에 넘겨줍니다.
    retriever = vector_store.as_retriever(search_kwargs={"k": 6})

    llm = Ollama(model="gemma2:2b", temperature=0.3)
    
    rag_prompt = ChatPromptTemplate.from_template("""
    너는 안민재 개발자의 포트폴리오 웹사이트 명세서와 이력을 마스터한 유능한 AI 조교야.
    반드시 아래 제공된 [참조 지식 문서]의 내용을 철저히 바탕으로 질문에 공손하고 상세하게 답변해줘.

    [참조 지식 문서]
    {context}
    
    질문: {question}
    답변:
    """)

    def combine_documents(docs):
        return "\n\n".join(doc.page_content for doc in docs)

    rag_chain = (
        {"context": retriever | combine_documents, "question": RunnablePassthrough()}
        | rag_prompt | llm | StrOutputParser()
    )
    print("✅ [2/3] Ollama RAG 랭체인 검색 엔진 최적화 빌드 완료!")

@app.route('/api/chat', methods=['POST'])
def chat_endpoint():
    data = request.json
    user_message = data.get("message", "")
    
    if not user_message:
        return jsonify({"error": "질문 내용이 없습니다."}), 400
        
    try:
        print(f"📥 웹 요청 수신: {user_message}")
        reply = rag_chain.invoke(user_message)
        print(f"📤 Ollama RAG 답변 매칭 및 생성 완료!")
        return jsonify({"reply": reply})
    except Exception as e:
        print(f"❌ 에러 발생: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    init_rag_system()
    print("🚀 [3/3] 로컬 RAG API 서버 가동 시작 ➔ http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=False)