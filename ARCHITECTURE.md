# Architecture - Enterprise RAG Assistant

## System Overview

```
                    User Query
                         |
                         v
              +--------------------+
              |   React Frontend   |  (Port 3000)
              |   - Login/Signup   |
              |   - Chat Interface |
              |   - Admin Panel    |
              +--------+-----------+
                       |
                       v
              +--------------------+
              | Node.js Backend    |  (Port 5000)
              | - JWT Auth         |
              | - RBAC Middleware   |
              | - API Gateway      |
              | - Audit Logging    |
              +--------+-----------+
                       |
          +------------+------------+
          |                         |
          v                         v
  +---------------+       +------------------+
  |   MongoDB     |       | Python AI Service|  (Port 8000)
  | - Users       |       | - Query Router   |
  | - Audit Logs  |       | - Hybrid Search  |
  +---------------+       | - LLM Generator  |
                           +--------+---------+
                                    |
                           +--------+---------+
                           |    ChromaDB      |
                           | Vector Database  |
                           +------------------+
```

## Component Architecture

### 1. Frontend (React 18)

```
frontend/src/
  App.js                    # Route definitions
  context/AuthContext.js     # JWT state management
  services/api.js            # HTTP client layer
  pages/
    LoginPage.js             # Authentication
    SignupPage.js            # User registration
    ChatPage.js              # Main RAG chat interface
    AdminPage.js             # System dashboard
    AuditLogPage.js          # Query audit trail
  components/
    Navbar.js                # Navigation with role-based links
    ProtectedRoute.js        # Route guard (auth + role check)
    ChatMessage.js           # Message bubble with markdown
    ConfidenceIndicator.js   # Color-coded confidence bar
    SourceCard.js            # Citation card with relevance score
    RetrievalTrace.js        # Expandable retrieval details
```

### 2. Backend (Node.js + Express)

```
backend/src/
  server.js                  # Express app setup
  config/db.js               # MongoDB connection
  models/
    User.js                  # User schema with bcrypt hashing
    AuditLog.js              # Query audit trail schema
  middleware/
    auth.js                  # JWT token verification
    rbac.js                  # Role-based access control
    errorHandler.js          # Global error handler
  controllers/
    authController.js        # Login, signup, profile
    queryController.js       # RAG query proxy + audit
    adminController.js       # Admin operations
  routes/
    authRoutes.js            # /api/auth/*
    queryRoutes.js           # /api/query/*
    adminRoutes.js           # /api/admin/*
  utils/
    seedUsers.js             # Database seeding script
```

### 3. AI Service (Python FastAPI)

```
ai-service/
  main.py                    # FastAPI app + startup lifecycle
  config/settings.py         # Environment configuration
  ingestion/
    document_loader.py       # PDF, CSV, JSON file loading
    metadata_mapper.py       # Access level assignment
  vectorstore/
    chroma_store.py          # ChromaDB with SentenceTransformer
  retrievers/
    semantic_retriever.py    # Vector similarity search
    keyword_retriever.py     # BM25 keyword search
    hybrid_retriever.py      # Reciprocal Rank Fusion
  routing/
    query_router.py          # Intent detection + source routing
    api_routes.py            # FastAPI endpoints
  prompts/
    system_prompts.py        # RAG system instructions
  generators/
    response_generator.py    # Groq/Gemini LLM generation
```

## Data Flow

### Query Processing Pipeline

```
1. User types query in chat
       |
2. Frontend sends POST /api/query with JWT
       |
3. Backend auth middleware validates JWT
       |
4. RBAC middleware builds metadata filter:
   - admin    -> no filter (sees everything)
   - hr       -> department: HR, access_level: [employee, hr]
   - finance  -> department: Finance, access_level: [employee, finance]
   - it_admin -> department: IT, access_level: [employee, it_admin]
   - manager  -> access_level: [employee, manager], own department
   - employee -> access_level: [employee] only
       |
5. Backend proxies to AI Service with:
   { query, metadata_filter, user_role, user_department }
       |
6. Query Router analyzes intent:
   - "salary" -> csv data, sensitive flag
   - "outage" -> json logs
   - "policy" -> pdf documents
       |
7. Hybrid Retriever runs:
   a. Semantic search (ChromaDB vectors, weight: 0.7)
   b. BM25 keyword search (weight: 0.3)
   c. Reciprocal Rank Fusion combines results
   d. Metadata filter applied for RBAC
       |
8. Response Generator:
   a. Builds context from top-5 chunks
   b. Sends to LLM (Groq Llama 3.3 70B)
   c. Calculates confidence from similarity scores
   d. Extracts source citations
       |
9. Backend logs to AuditLog collection
       |
10. Frontend renders:
    - Markdown answer
    - Confidence indicator (green/yellow/red)
    - Source cards with relevance scores
    - Retrieval trace panel
```

## RBAC Matrix

| Role     | Employee Docs | HR Data  | Finance Data | IT Logs  | Admin Panel |
|----------|:------------:|:--------:|:------------:|:--------:|:-----------:|
| admin    |      Yes     |   Yes    |     Yes      |   Yes    |     Yes     |
| hr       |      Yes     |   Yes    |      No      |    No    |      No     |
| finance  |      Yes     |    No    |     Yes      |    No    |      No     |
| it_admin |      Yes     |    No    |      No      |   Yes    |      No     |
| manager  |      Yes     |    No    |      No      |    No    |      No     |
| employee |      Yes     |    No    |      No      |    No    |      No     |

## Technology Stack

| Layer           | Technology                          |
|-----------------|-------------------------------------|
| Frontend        | React 18, React Router v6           |
| Backend API     | Node.js, Express 4                  |
| Authentication  | JWT (jsonwebtoken, bcryptjs)         |
| Database        | MongoDB (Mongoose)                  |
| AI Service      | Python, FastAPI                     |
| Vector DB       | ChromaDB (persistent)               |
| Embeddings      | SentenceTransformers (all-MiniLM-L6-v2) |
| LLM             | Groq (Llama 3.3 70B Versatile)      |
| Keyword Search  | BM25 (rank-bm25)                    |
| Security        | Helmet, CORS, Rate Limiting         |

## Dataset Sources

| File                          | Type   | Department | Access Level |
|-------------------------------|--------|------------|-------------|
| leave_policy.txt              | PDF    | HR         | employee    |
| security_policy.txt           | PDF    | IT         | employee    |
| employee_handbook.txt         | PDF    | HR         | employee    |
| compliance_report_q1_2026.txt | PDF    | Finance    | manager     |
| employees.csv                 | CSV    | HR         | hr          |
| sales_report_q1_2026.csv      | CSV    | Finance    | finance     |
| compliance_violations.csv     | CSV    | Finance    | manager     |
| server_logs.json              | JSON   | IT         | it_admin    |
| audit_logs.json               | JSON   | IT         | admin       |
| data_retention_policy.txt     | Policy | Legal      | manager     |
| incident_response_plan.txt    | Policy | IT         | it_admin    |
