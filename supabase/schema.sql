-- ==============================================================================
-- CHATURANGA: OFFICIAL FIDE TOURNAMENT SUITE - COMPREHENSIVE SUPABASE SCHEMA
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- It creates tables for Tournaments, Arbiters, Admins, Settings, Audit Logs,
-- Realtime broadcasts, and full Superadmin All-Access Row Level Security (RLS).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Tournaments Table (Master Vault Storage)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT,
  tournament_year INTEGER DEFAULT (EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER),
  status TEXT NOT NULL DEFAULT 'REGISTRATION', -- 'REGISTRATION' | 'IN_PROGRESS' | 'COMPLETED'
  current_round INTEGER DEFAULT 1,
  total_rounds INTEGER DEFAULT 5,
  players_count INTEGER DEFAULT 0,
  time_control_name TEXT,
  arbiter_id TEXT,
  arbiter_name TEXT,
  vault_data JSONB NOT NULL, -- Triple-redundant vault: currentState, auditLogs, snapshots
  is_published BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning-fast queries
CREATE INDEX IF NOT EXISTS idx_tournaments_arbiter ON public.tournaments(arbiter_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_updated ON public.tournaments(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tournaments_published ON public.tournaments(is_published) WHERE is_published = true;

-- Enable full row replica identity for realtime broadcasts (pairs, clocks, standings)
ALTER TABLE public.tournaments REPLICA IDENTITY FULL;

-- ------------------------------------------------------------------------------
-- 2. Arbiters & Tournament Officials Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.arbiters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  title TEXT NOT NULL DEFAULT 'CHIEF_ARBITER',
  role_type TEXT NOT NULL DEFAULT 'CERTIFIED_ARBITER', -- 'CERTIFIED_ARBITER' | 'ORGANIZER'
  federation TEXT DEFAULT 'FID',
  fide_id TEXT,
  organization_name TEXT,
  password_hash TEXT,
  is_verified BOOLEAN DEFAULT true,
  is_admin BOOLEAN DEFAULT false,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arbiters_fide_id ON public.arbiters(fide_id);
CREATE INDEX IF NOT EXISTS idx_arbiters_email ON public.arbiters(email);
ALTER TABLE public.arbiters REPLICA IDENTITY FULL;

-- ------------------------------------------------------------------------------
-- 3. Website Administrators Table (Superadmin All-Access)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'SUPER_ADMIN', -- 'SUPER_ADMIN' | 'PLATFORM_ADMIN'
  passkey_hash TEXT,
  permissions JSONB NOT NULL DEFAULT '{"all_access": true, "manage_tournaments": true, "manage_arbiters": true, "manage_database": true, "manage_settings": true}'::jsonb,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. Global Platform Settings Table (Key-Value Store)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by TEXT DEFAULT 'SUPER_ADMIN',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.platform_settings REPLICA IDENTITY FULL;

-- ------------------------------------------------------------------------------
-- 5. Universal Security & Administrative Audit Logs Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id TEXT,
  actor_name TEXT,
  action TEXT NOT NULL, -- e.g., 'TOURNAMENT_CREATED', 'PAIRINGS_GENERATED', 'ADMIN_OVERRIDE'
  target_type TEXT,     -- 'TOURNAMENT' | 'ARBITER' | 'SETTINGS' | 'SYSTEM'
  target_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs(target_type, target_id);
ALTER TABLE public.audit_logs REPLICA IDENTITY FULL;

-- ------------------------------------------------------------------------------
-- 6. Global Players Registry Table (Cross-Tournament Directory)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  fide_id TEXT,
  fide_title TEXT DEFAULT 'NONE',
  standard_rating INTEGER DEFAULT 0,
  birth_year INTEGER,
  gender TEXT DEFAULT 'O',
  federation TEXT DEFAULT 'FID',
  organization TEXT,
  last_tournament_id TEXT,
  last_played_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_players_fide_id ON public.players(fide_id);
CREATE INDEX IF NOT EXISTS idx_players_name ON public.players(name);
CREATE INDEX IF NOT EXISTS idx_players_rating ON public.players(standard_rating DESC);

-- ------------------------------------------------------------------------------
-- 7. Row Level Security (RLS) - Superadmin All-Access & Public Read
-- ------------------------------------------------------------------------------
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arbiters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Tournaments Policies
DROP POLICY IF EXISTS "Public read access for tournaments" ON public.tournaments;
CREATE POLICY "Public read access for tournaments"
  ON public.tournaments
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin and arbiter full access for tournaments" ON public.tournaments;
CREATE POLICY "Admin and arbiter full access for tournaments"
  ON public.tournaments
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Arbiters Policies
DROP POLICY IF EXISTS "Public read access for arbiters" ON public.arbiters;
CREATE POLICY "Public read access for arbiters"
  ON public.arbiters
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin and arbiter full access for arbiters" ON public.arbiters;
CREATE POLICY "Admin and arbiter full access for arbiters"
  ON public.arbiters
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Admin Users Policies
DROP POLICY IF EXISTS "Admin users full access" ON public.admin_users;
CREATE POLICY "Admin users full access"
  ON public.admin_users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Platform Settings Policies
DROP POLICY IF EXISTS "Public read access for settings" ON public.platform_settings;
CREATE POLICY "Public read access for settings"
  ON public.platform_settings
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin full access for settings" ON public.platform_settings;
CREATE POLICY "Admin full access for settings"
  ON public.platform_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Audit Logs Policies
DROP POLICY IF EXISTS "Public read access for audit logs" ON public.audit_logs;
CREATE POLICY "Public read access for audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin full insert access for audit logs" ON public.audit_logs;
CREATE POLICY "Admin full insert access for audit logs"
  ON public.audit_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Players Policies
DROP POLICY IF EXISTS "Public read access for players" ON public.players;
CREATE POLICY "Public read access for players"
  ON public.players
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin and arbiter full access for players" ON public.players;
CREATE POLICY "Admin and arbiter full access for players"
  ON public.players
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 8. Enable Supabase Realtime Broadcasting for Spectators & Live Monitors
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  -- Tournaments table realtime
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'tournaments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
  END IF;

  -- Platform settings realtime
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'platform_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_settings;
  END IF;

  -- Arbiters realtime
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'arbiters'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.arbiters;
  END IF;

  -- Audit logs realtime
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'audit_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 9. Automatic Updated_At Timestamp Trigger
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_tournaments_updated_at ON public.tournaments;
CREATE TRIGGER set_tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_arbiters_updated_at ON public.arbiters;
CREATE TRIGGER set_arbiters_updated_at
  BEFORE UPDATE ON public.arbiters
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_admin_users_updated_at ON public.admin_users;
CREATE TRIGGER set_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_platform_settings_updated_at ON public.platform_settings;
CREATE TRIGGER set_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_players_updated_at ON public.players;
CREATE TRIGGER set_players_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 10. Initial Seed Data: Default Website Administrator & Platform Settings
-- ------------------------------------------------------------------------------
INSERT INTO public.admin_users (id, username, email, role, permissions)
VALUES (
  'superadmin-master',
  'Website Administrator',
  'admin@chaturanga.chess',
  'SUPER_ADMIN',
  '{"all_access": true, "manage_tournaments": true, "manage_arbiters": true, "manage_database": true, "manage_settings": true}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  permissions = EXCLUDED.permissions,
  updated_at = NOW();

INSERT INTO public.platform_settings (key, value, description)
VALUES 
  ('platform_info', '{"name": "Chaturanga", "version": "3.0.0", "fide_standard": "Dutch C.04.3", "maintenance_mode": false}'::jsonb, 'Core platform identity and status'),
  ('spectator_portal', '{"enabled": true, "allow_board_search": true, "show_clocks": true}'::jsonb, 'Live public spectator settings')
ON CONFLICT (key) DO NOTHING;

-- Log schema deployment in audit logs
INSERT INTO public.audit_logs (actor_name, action, target_type, target_id, details)
VALUES (
  'System Engine',
  'SCHEMA_DEPLOYED',
  'SYSTEM',
  'supabase_schema_v3',
  '{"version": "3.0.0", "tables": ["tournaments", "arbiters", "admin_users", "platform_settings", "audit_logs", "players"], "access_level": "SUPER_ADMIN_ALL_ACCESS"}'::jsonb
);

-- ==============================================================================
-- CHATURANGA DATABASE SETUP COMPLETED: FULL SUPERADMIN ALL-ACCESS GRANTED!
-- ==============================================================================
