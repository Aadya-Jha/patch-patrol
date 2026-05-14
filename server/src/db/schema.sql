-- ============================================================
-- Patch Patrol - Production-Ready Database Schema
-- GitHub OAuth & Repository Access Management
-- ============================================================

-- GitHub user accounts (OAuth identity)
CREATE TABLE IF NOT EXISTS github_accounts (
  id SERIAL PRIMARY KEY,
  github_user_id VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Encrypted GitHub access tokens (OAuth or GitHub App)
CREATE TABLE IF NOT EXISTS github_tokens (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES github_accounts(id) ON DELETE CASCADE,
  token_type VARCHAR(50) NOT NULL CHECK (token_type IN ('oauth', 'app_installation', 'fallback')),
  access_token_encrypted TEXT NOT NULL,
  iv_hex VARCHAR(32) NOT NULL,
  auth_tag_hex VARCHAR(32) NOT NULL,
  scope TEXT, -- comma-separated scopes
  expires_at TIMESTAMP NULL, -- NULL = non-expiring token (legacy PAT)
  installation_id INTEGER NULL, -- GitHub App installation ID (if applicable)
  token_metadata JSONB DEFAULT '{}', -- additional data (refresh_token, refresh_expires_at, etc.)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP NULL,
  revoked_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE (account_id, token_type)
);

-- OAuth state/PKCE storage for CSRF protection
CREATE TABLE IF NOT EXISTS oauth_sessions (
  id SERIAL PRIMARY KEY,
  state VARCHAR(255) UNIQUE NOT NULL,
  pkce_verifier_hash VARCHAR(255) NOT NULL,
  code_verifier_encrypted TEXT NOT NULL,
  code_verifier_iv VARCHAR(32) NOT NULL,
  code_verifier_tag VARCHAR(32) NOT NULL,
  account_id INTEGER REFERENCES github_accounts(id),
  redirect_uri TEXT,
  ip_address INET,
  user_agent TEXT,
  used_at TIMESTAMP NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_oauth_sessions_expires ON oauth_sessions(expires_at) WHERE expires_at > NOW();

-- Audit log for security tracking
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES github_accounts(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50), -- 'repository', 'scan', 'token', 'oauth'
  resource_id INTEGER,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Existing tables (unchanged but with FK improvements)
CREATE TABLE IF NOT EXISTS repositories (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES github_accounts(id) ON DELETE CASCADE,
  installation_id INTEGER NULL,
  owner VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  default_branch VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  visibility VARCHAR(50) DEFAULT 'unknown', -- 'public', 'private', 'internal'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (owner, name)
);

-- Existing tables remain compatible
CREATE TABLE IF NOT EXISTS scans (
  id SERIAL PRIMARY KEY,
  repo_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  trigger_source VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dependencies (
  id SERIAL PRIMARY KEY,
  scan_id INTEGER NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  package_name VARCHAR(255) NOT NULL,
  version VARCHAR(255),
  normalized_version VARCHAR(255),
  ecosystem VARCHAR(50) NOT NULL,
  manifest_path VARCHAR(255) NOT NULL,
  dependency_type VARCHAR(50) NOT NULL DEFAULT 'direct'
);

CREATE TABLE IF NOT EXISTS vulnerabilities (
  id SERIAL PRIMARY KEY,
  cve_id VARCHAR(100) UNIQUE NOT NULL,
  source VARCHAR(50) NOT NULL,
  severity VARCHAR(20),
  description TEXT,
  reference_url TEXT,
  published_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scan_vulnerabilities (
  id SERIAL PRIMARY KEY,
  scan_id INTEGER NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  dependency_id INTEGER NOT NULL REFERENCES dependencies(id) ON DELETE CASCADE,
  vulnerability_id INTEGER NOT NULL REFERENCES vulnerabilities(id) ON DELETE CASCADE,
  risk_level VARCHAR(20),
  risk_score FLOAT,
  ai_explanation TEXT,
  ai_provider VARCHAR(50),
  ai_model VARCHAR(100),
  ai_generated_at TIMESTAMP,
  suggested_fix TEXT,
  UNIQUE (scan_id, dependency_id, vulnerability_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_github_accounts_user_id ON github_accounts(github_user_id);
CREATE INDEX IF NOT EXISTS idx_github_tokens_account ON github_tokens(account_id, token_type, is_active);
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_state ON oauth_sessions(state) WHERE expires_at > NOW();
CREATE INDEX IF NOT EXISTS idx_audit_logs_account ON audit_logs(account_id, created_at);
CREATE INDEX IF NOT EXISTS idx_repositories_owner_name ON repositories(owner, name);
CREATE INDEX IF NOT EXISTS idx_repositories_account ON repositories(account_id);
CREATE INDEX IF NOT EXISTS idx_scans_repo_id ON scans(repo_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_scan_id ON dependencies(scan_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_cve_id ON vulnerabilities(cve_id);
CREATE INDEX IF NOT EXISTS idx_scan_vulnerabilities_scan_id ON scan_vulnerabilities(scan_id);
