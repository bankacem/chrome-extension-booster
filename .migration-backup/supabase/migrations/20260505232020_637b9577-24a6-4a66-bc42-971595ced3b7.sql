
CREATE TABLE IF NOT EXISTS public.seo_agent_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  keyword TEXT NOT NULL,
  niche TEXT,
  model TEXT,
  strategy JSONB,
  competitor_data JSONB,
  cluster JSONB,
  ctr JSONB,
  word_count INTEGER,
  successful_patterns JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seo_agent_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read agent memory"
  ON public.seo_agent_memory FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert agent memory"
  ON public.seo_agent_memory FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_seo_agent_memory_keyword ON public.seo_agent_memory (keyword);
CREATE INDEX IF NOT EXISTS idx_seo_agent_memory_created ON public.seo_agent_memory (created_at DESC);
