-- Database Schema for Patch Patrol

CREATE TABLE IF NOT EXISTS github_installations (
  id SERIAL PRIMARY KEY,
  github_account_id VARCHAR(255) UNIQUE NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  encrypted_token TEXT NOT NULL,
  iv_hex VARCHAR(32) NOT NULL,
  installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS repositories (
  id SERIAL PRIMARY KEY,
  installation_id INTEGER REFERENCES github_installations(id),
  owner VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scans (
  id SERIAL PRIMARY KEY,
  repo_id INTEGER REFERENCES repositories(id),
  scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dependencies (
  id SERIAL PRIMARY KEY,
  scan_id INTEGER REFERENCES scans(id),
  package_name VARCHAR(255) NOT NULL,
  version VARCHAR(255),
  ecosystem VARCHAR(50) NOT NULL
);

-- Additional tables for future features

CREATE TABLE IF NOT EXISTS vulnerabilities (
  id SERIAL PRIMARY KEY,
  cve_id VARCHAR(50) UNIQUE NOT NULL,
  severity VARCHAR(20),
  description TEXT,
  published_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scan_vulnerabilities (
  id SERIAL PRIMARY KEY,
  scan_id INTEGER REFERENCES scans(id),
  dependency_id INTEGER REFERENCES dependencies(id),
  vulnerability_id INTEGER REFERENCES vulnerabilities(id),
  risk_score FLOAT,
  ai_explanation TEXT,
  suggested_fix TEXT
);
