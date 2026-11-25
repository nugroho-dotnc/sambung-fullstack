CREATE TABLE account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('petani','pembeli','admin')),
  name text NOT NULL,
  province text NOT NULL,
  regency text NOT NULL,
  district text NOT NULL,
  business_name text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','closing','closed')),
  consent_at timestamptz,
  consent_version text
);
CREATE TABLE otp_challenge (
  phone text PRIMARY KEY,
  digest text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0
);
CREATE TABLE auth_session (
  token_hash text PRIMARY KEY,
  phone text NOT NULL,
  account_id uuid REFERENCES account(id),
  expires_at timestamptz NOT NULL
);
CREATE INDEX auth_session_expiry ON auth_session(expires_at);
CREATE TABLE schema_migration (name text PRIMARY KEY);
INSERT INTO schema_migration (name) VALUES ('001_identity');
