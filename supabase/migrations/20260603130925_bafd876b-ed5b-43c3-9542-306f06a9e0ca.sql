
CREATE TABLE public.mk_state (
  id text PRIMARY KEY DEFAULT 'singleton',
  workouts jsonb NOT NULL DEFAULT '{}'::jsonb,
  sleep jsonb NOT NULL DEFAULT '{}'::jsonb,
  tasks jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  maxw jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.mk_state TO anon;
GRANT SELECT, INSERT, UPDATE ON public.mk_state TO authenticated;
GRANT ALL ON public.mk_state TO service_role;

ALTER TABLE public.mk_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read mk_state"  ON public.mk_state FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public write mk_state" ON public.mk_state FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public update mk_state" ON public.mk_state FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.mk_state (id) VALUES ('singleton') ON CONFLICT DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.mk_state;
ALTER TABLE public.mk_state REPLICA IDENTITY FULL;
