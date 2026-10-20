-- ==============================================================================
-- ROYAL SWISS: OFFICIAL FIDE TOURNAMENT SUITE - SUPABASE DATABASE SCHEMA
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- It creates tables for Tournaments, Arbiters, Live Spectator Sync, and Realtime.
-- ==============================================================================

-- 1. Create Tournaments Table
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by arbiter and status
CREATE INDEX IF NOT EXISTS idx_tournaments_arbiter ON public.tournaments(arbiter_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_updated ON public.tournaments(updated_at DESC);

-- Enable full row replica identity for realtime broadcasts (pairs, clocks, standings)
ALTER TABLE public.tournaments REPLICA IDENTITY FULL;

-- 2. Create Arbiters Table
CREATE TABLE IF NOT EXISTS public.arbiters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  title TEXT NOT NULL DEFAULT 'CHIEF_ARBITER',
  role_type TEXT NOT NULL DEFAULT 'CERTIFIED_ARBITER',
  federation TEXT DEFAULT 'FID',
  fide_id TEXT,
  organization_name TEXT,
  password_hash TEXT,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arbiters_fide_id ON public.arbiters(fide_id);

-- 3. Row Level Security (RLS) Setup
-- Enable RLS on both tables
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arbiters ENABLE ROW LEVEL SECURITY;

-- Tournaments Policies (idempotent)
DROP POLICY IF EXISTS "Public read access for tournaments" ON public.tournaments;
CREATE POLICY "Public read access for tournaments"
  ON public.tournaments
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow anon insert and update for tournaments" ON public.tournaments;
CREATE POLICY "Allow anon insert and update for tournaments"
  ON public.tournaments
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Arbiters Policies (idempotent)
DROP POLICY IF EXISTS "Public read access for arbiters" ON public.arbiters;
CREATE POLICY "Public read access for arbiters"
  ON public.arbiters
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow anon insert and update for arbiters" ON public.arbiters;
CREATE POLICY "Allow anon insert and update for arbiters"
  ON public.arbiters
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Enable Supabase Realtime for Live Spectator Pairings & Standings
-- This allows tournament pairing updates and clock timers to stream in real-time
-- to spectator mobile phones, projector displays, and parent portals!
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'tournaments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
  END IF;
END $$;

-- 5. Updated At Trigger
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

-- ==============================================================================
-- Schema installation complete! Tournaments and Arbiters are now fully synchronized.
-- ==============================================================================
