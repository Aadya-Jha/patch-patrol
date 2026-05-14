-- Migration: Convert from github_installations to OAuth model
-- This script migrates existing data from the old schema to the new one.
-- Run this BEFORE starting the server with the new code.

BEGIN;

-- 1. Create github_accounts from existing github_installations
INSERT INTO github_accounts (github_user_id, username, created_at, updated_at)
SELECT
  gi.github_account_id,
  gi.account_name,
  gi.installed_at,
  gi.installed_at
FROM github_installations gi
ON CONFLICT (github_user_id) DO NOTHING;

-- 2. Create github_tokens linking to the accounts
INSERT INTO github_tokens (
  account_id,
  token_type,
  access_token_encrypted,
  iv_hex,
  auth_tag_hex,
  scope,
  expires_at,
  token_metadata,
  created_at,
  last_used_at,
  revoked_at,
  is_active
)
SELECT
  ga.id,
  'oauth' as token_type,
  gi.encrypted_token as access_token_encrypted,
  gi.iv_hex,
  gi.auth_tag_hex,
  NULL as scope,
  NULL as expires_at, -- Legacy tokens have no expiry
  '{}'::jsonb as token_metadata,
  gi.installed_at,
  gi.installed_at as last_used_at,
  NULL as revoked_at,
  TRUE as is_active
FROM github_accounts ga
JOIN github_installations gi ON gi.github_account_id = ga.github_user_id
ON CONFLICT DO NOTHING;

-- 3. Update repositories to reference the account_id instead of installation_id
UPDATE repositories r
SET account_id = ga.id,
    installation_id = NULL
FROM github_accounts ga
WHERE r.installation_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM github_installations gi
    WHERE gi.id = r.installation_id
      AND gi.github_account_id = ga.github_user_id
  );

-- 4. Clean up old installation records (optional - comment out if you want to keep them)
-- DROP TABLE IF EXISTS github_installations CASCADE;

COMMIT;

-- After migration, verify:
-- SELECT * FROM github_accounts;
-- SELECT * FROM github_tokens;
-- SELECT * FROM repositories WHERE account_id IS NULL;
