# Workflow

## 1. Rough Workflow (Core Features Only)

### Step 0 — GitHub Repo Access

- Developer grants MCP server access via a Personal Access Token (PAT) or an OAuth App.
- The token allows the MCP server to read dependency files (package.json, requirements.txt, pom.xml, etc.), create GitHub issues, and optionally comment on PRs.
- Tokens are stored securely in the database and used for GitHub API calls.

### Step 1 — Trigger

- A GitHub webhook triggers a vulnerability check on push if dependency files changed; developers can also trigger scans manually via the dashboard.
- The webhook payload is sent to the MCP server backend.

### Step 2 — Pull & Parse Dependencies

- The MCP server fetches repo files via the GitHub API using the access token.
- Parse dependency files to extract package names, versions, and version constraints.
- Build a dependency tree including transitive dependencies.

### Step 3 — Vulnerability Check

- The server checks dependencies against CVE sources (NVD, Snyk, etc.).
- Flags include outdated packages, deprecated packages, and known vulnerabilities.

### Step 4 — AI Analysis

- The AI module evaluates each dependency and assigns a risk score based on severity, project context, and usage.
- Detect transitive vulnerabilities that might impact the project.
- Generate natural-language explanations and suggest fixes/upgrades with impact analysis.

### Step 5 — Issue & Notification

- The MCP server creates GitHub issues for critical vulnerabilities, pre-filled with AI recommendations and explanations.
- Optional: send Slack/Teams notifications summarizing risk.

### Step 6 — Dashboard Visualization

- Update the web dashboard with repo name, last scan date, risk scores, version-gap visualizations, and suggested fixes.
- Developers can view, explore, and manually trigger scans from the dashboard.

## 2. High-Level Architecture (Core Features Only)

GitHub Repos (package.json, requirements.txt, etc.)
→ GitHub access via PAT/OAuth
→ MCP Server Backend

### MCP Server Backend (core components)

- Auth Manager — stores GitHub tokens securely.
- Dependency Parser — builds dependency tree (including transitive dependencies).
- CVE Lookup Module — checks for known vulnerabilities.
- AI Risk Analyzer — computes risk scores and explanations.
- GitHub Issue Creator — opens issues for critical vulnerabilities.
- Notification Sender — sends Slack/Teams alerts.

→ Database

- Dependency state
- Risk scores
- Scan history

→ Web Dashboard

- Repo overview
- Dependency list
- Risk & version gaps
- Suggested fixes

## Component Descriptions with GitHub Access

### GitHub Repos

- Source of truth for dependency files.
- Developers grant access via PAT or OAuth.
- Pushes trigger webhooks to the MCP server.

### MCP Server Backend

- Auth Manager: stores and uses GitHub tokens securely for API access.
- Dependency Parser: reads dependency files and builds dependency trees (including transitive dependencies).
- CVE Lookup Module: checks for known vulnerabilities.
- AI Risk Analyzer: assigns risk scores, prioritizes issues, and generates natural-language explanations.
- GitHub Issue Creator: automatically opens issues for critical dependencies.
- Notification Sender: sends optional Slack/Teams alerts.

### Database

- Stores dependency states, risk scores, and scan history.

### Web Dashboard

- Displays repo status, dependency risks, version gaps, and suggested fixes.
- Allows manual scan triggers and dashboard exploration.

# Workflow

## 1. Rough Workflow (Core Features Only)

### Step 0 — GitHub Repo Access

- Developer grants MCP server access via a Personal Access Token (PAT) or an OAuth App.
- The token allows the MCP server to read dependency files (package.json, requirements.txt, pom.xml, etc.), create GitHub issues, and optionally comment on PRs.
- Tokens are stored securely in the database and used for GitHub API calls.

### Step 1 — Trigger

- A GitHub webhook triggers a vulnerability check on push if dependency files changed; developers can also trigger scans manually via the dashboard.
- The webhook payload is sent to the MCP server backend.

### Step 2 — Pull & Parse Dependencies

- The MCP server fetches repo files via the GitHub API using the access token.
- Parse dependency files to extract package names, versions, and version constraints.
- Build a dependency tree including transitive dependencies.

### Step 3 — Vulnerability Check

- The server checks dependencies against CVE sources (NVD, Snyk, etc.).
- Flags include outdated packages, deprecated packages, and known vulnerabilities.

### Step 4 — AI Analysis

- The AI module evaluates each dependency and assigns a risk score based on severity, project context, and usage.
- Detect transitive vulnerabilities that might impact the project.
- Generate natural-language explanations and suggest fixes/upgrades with impact analysis.

### Step 5 — Issue & Notification

- The MCP server creates GitHub issues for critical vulnerabilities, pre-filled with AI recommendations and explanations.
- Optional: send Slack/Teams notifications summarizing risk.

### Step 6 — Dashboard Visualization

- Update the web dashboard with repo name, last scan date, risk scores, version-gap visualizations, and suggested fixes.
- Developers can view, explore, and manually trigger scans from the dashboard.

## 2. High-Level Architecture (Core Features Only)

GitHub Repos (package.json, requirements.txt, etc.)
→ GitHub access via PAT/OAuth
→ MCP Server Backend

### MCP Server Backend (core components)

- Auth Manager — stores GitHub tokens securely.
- Dependency Parser — builds dependency tree (including transitive dependencies).
- CVE Lookup Module — checks for known vulnerabilities.
- AI Risk Analyzer — computes risk scores and explanations.
- GitHub Issue Creator — opens issues for critical vulnerabilities.
- Notification Sender — sends Slack/Teams alerts.

→ Database

- Dependency state
- Risk scores
- Scan history

→ Web Dashboard

- Repo overview
- Dependency list
- Risk & version gaps
- Suggested fixes

## Component Descriptions with GitHub Access

### GitHub Repos

- Source of truth for dependency files.
- Developers grant access via PAT or OAuth.
- Pushes trigger webhooks to the MCP server.

### MCP Server Backend

- Auth Manager: stores and uses GitHub tokens securely for API access.
- Dependency Parser: reads dependency files and builds dependency trees (including transitive dependencies).
- CVE Lookup Module: checks for known vulnerabilities.
- AI Risk Analyzer: assigns risk scores, prioritizes issues, and generates natural-language explanations.
- GitHub Issue Creator: automatically opens issues for critical dependencies.
- Notification Sender: sends optional Slack/Teams alerts.

### Database

- Stores dependency states, risk scores, and scan history.

### Web Dashboard

- Displays repo status, dependency risks, version gaps, and suggested fixes.
- Allows manual scan triggers and dashboard exploration.
