
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read recordings bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'recordings');

CREATE POLICY "public write recordings bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'recordings');

CREATE POLICY "public update recordings bucket"
ON storage.objects FOR UPDATE
USING (bucket_id = 'recordings');

CREATE POLICY "public delete recordings bucket"
ON storage.objects FOR DELETE
USING (bucket_id = 'recordings');
