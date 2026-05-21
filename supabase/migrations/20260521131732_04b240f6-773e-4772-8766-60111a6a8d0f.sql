CREATE TABLE public.capture_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 60,
  status text NOT NULL DEFAULT 'pending',
  recording_id uuid,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  picked_up_at timestamptz,
  completed_at timestamptz
);

CREATE INDEX idx_capture_requests_pending ON public.capture_requests (created_at) WHERE status = 'pending';

ALTER TABLE public.capture_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read capture_requests" ON public.capture_requests FOR SELECT USING (true);
CREATE POLICY "public write capture_requests" ON public.capture_requests FOR ALL USING (true) WITH CHECK (true);