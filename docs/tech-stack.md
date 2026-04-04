# Tech Stack

## Backend

- Node.js + Express.js — API server, GitHub webhook handling, dependency parsing.
- Axios — GitHub API integration.

## Frontend

- React — dashboard UI.
- Chart.js — risk visualization & version-gap charts.
- Tailwind CSS — styling & components.

## AI / Risk Analysis

**Embedding + vector DB (large-scale, context-aware)**

- Preprocess vulnerability data into vector embeddings via provider-routed models (for example, OpenRouter-routed OpenAI embeddings).
- Store embeddings in a vector DB (Pinecone, Weaviate, Milvus).
- AI query flow:
  1. Developer opens dashboard or triggers a scan.
  2. Extract repo dependencies and lookup similar vulnerabilities in the vector DB.
  3. Supply context to an LLM to generate explanations, prioritize risk, and suggest fixes.

- Pros: handles thousands of vulnerabilities efficiently and enables reasoning across dependencies.

## Database

- PostgreSQL — structured data: dependency state, risk scores, scan history.
- Vector database — stores vulnerability embeddings for context-aware AI queries.
- Redis (optional) — caching dependency checks and webhook events.

## Notifications & Integrations

- Slack API / Microsoft Teams Webhooks — alerts for critical vulnerabilities.
- GitHub API — auto-create issues and post PR comments.

# Tech Stack

## Backend

- Node.js + Express.js — API server, GitHub webhook handling, dependency parsing.
- Axios — GitHub API integration.

## Frontend

- React — dashboard UI.
- Chart.js — risk visualization & version-gap charts.
- Tailwind CSS — styling & components.

## AI / Risk Analysis

**Embedding + vector DB (large-scale, context-aware)**

- Preprocess vulnerability data into vector embeddings via provider-routed models (for example, OpenRouter-routed OpenAI embeddings).
- Store embeddings in a vector DB (Pinecone, Weaviate, Milvus).
- AI query flow:
  1. Developer opens dashboard or triggers a scan.
  2. Extract repo dependencies and lookup similar vulnerabilities in the vector DB.
  3. Supply context to an LLM to generate explanations, prioritize risk, and suggest fixes.

- Pros: handles thousands of vulnerabilities efficiently and enables reasoning across dependencies.

## Database

- PostgreSQL — structured data: dependency state, risk scores, scan history.
- Vector database — stores vulnerability embeddings for context-aware AI queries.
- Redis (optional) — caching dependency checks and webhook events.

## Notifications & Integrations

- Slack API / Microsoft Teams Webhooks — alerts for critical vulnerabilities.
- GitHub API — auto-create issues and post PR comments.
