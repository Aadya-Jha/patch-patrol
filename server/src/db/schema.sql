CREATE TABLE IF NOT EXISTS github_installations (
  id SERIAL PRIMARY KEY,
  github_account_id VARCHAR(255) UNIQUE NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  encrypted_token TEXT NOT NULL,
  iv_hex VARCHAR(32) NOT NULL,
  auth_tag_hex VARCHAR(32) NOT NULL,
  installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS repositories (
  id SERIAL PRIMARY KEY,
  installation_id INTEGER REFERENCES github_installations(id),
  owner VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  default_branch VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (owner, name)
);

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
  suggested_fix TEXT,
  UNIQUE (scan_id, dependency_id, vulnerability_id)
);

CREATE INDEX IF NOT EXISTS idx_repositories_owner_name ON repositories(owner, name);
CREATE INDEX IF NOT EXISTS idx_scans_repo_id ON scans(repo_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_scan_id ON dependencies(scan_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_cve_id ON vulnerabilities(cve_id);
CREATE INDEX IF NOT EXISTS idx_scan_vulnerabilities_scan_id ON scan_vulnerabilities(scan_id);
