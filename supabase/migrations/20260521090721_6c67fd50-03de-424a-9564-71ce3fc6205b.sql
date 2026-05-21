
-- Enums
CREATE TYPE public.recording_status AS ENUM ('pending','recording','processing','completed','failed');
CREATE TYPE public.segment_type AS ENUM ('news','interview','music','ad','sports','weather','travel','listener_call','political','entertainment','discussion','other');

-- Stations
CREATE TABLE public.stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT,
  genre TEXT,
  stream_url TEXT NOT NULL,
  logo_url TEXT,
  tags TEXT[] DEFAULT '{}',
  color TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  monitoring_start TIME NOT NULL DEFAULT '16:00',
  monitoring_end TIME NOT NULL DEFAULT '18:00',
  monitoring_days INT[] DEFAULT '{1,2,3,4,5}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recordings
CREATE TABLE public.recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  recording_date DATE NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  audio_url TEXT,
  duration_seconds INT,
  status public.recording_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.recordings (station_id, recording_date DESC);

-- Transcripts
CREATE TABLE public.transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  start_time INT NOT NULL DEFAULT 0,
  end_time INT NOT NULL DEFAULT 0,
  transcript TEXT NOT NULL,
  confidence NUMERIC(4,3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.transcripts (recording_id);

-- Segments
CREATE TABLE public.segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  recording_id UUID REFERENCES public.recordings(id) ON DELETE SET NULL,
  transcript_id UUID REFERENCES public.transcripts(id) ON DELETE SET NULL,
  segment_date DATE NOT NULL,
  segment_time TIME NOT NULL,
  segment_type public.segment_type NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  summary TEXT,
  people TEXT[] DEFAULT '{}',
  organizations TEXT[] DEFAULT '{}',
  locations TEXT[] DEFAULT '{}',
  topics TEXT[] DEFAULT '{}',
  tone TEXT,
  confidence NUMERIC(4,3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.segments (segment_date DESC, station_id);
CREATE INDEX ON public.segments USING GIN (topics);
CREATE INDEX ON public.segments USING GIN (people);

-- Daily reports
CREATE TABLE public.daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL,
  station_id UUID REFERENCES public.stations(id) ON DELETE CASCADE,
  generated_summary TEXT,
  highlights JSONB DEFAULT '[]'::jsonb,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.daily_reports (report_date DESC);

-- Updated-at trigger for stations
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER stations_set_updated_at BEFORE UPDATE ON public.stations
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- RLS (permissive demo policies)
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read stations" ON public.stations FOR SELECT USING (true);
CREATE POLICY "public write stations" ON public.stations FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "public read recordings" ON public.recordings FOR SELECT USING (true);
CREATE POLICY "public write recordings" ON public.recordings FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "public read transcripts" ON public.transcripts FOR SELECT USING (true);
CREATE POLICY "public write transcripts" ON public.transcripts FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "public read segments" ON public.segments FOR SELECT USING (true);
CREATE POLICY "public write segments" ON public.segments FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "public read daily_reports" ON public.daily_reports FOR SELECT USING (true);
CREATE POLICY "public write daily_reports" ON public.daily_reports FOR ALL USING (true) WITH CHECK (true);
