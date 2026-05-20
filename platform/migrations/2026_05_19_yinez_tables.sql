-- nycmaid parity: yinez_memory + yinez_skills tables
-- Code at src/lib/yinez/{agent,core,tools}.ts references both tables.
-- Without these, Yinez errors on first SMS/chat post-cutover.

-- ── 1. yinez_memory ──
CREATE TABLE IF NOT EXISTS public.yinez_memory (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id   uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  type        text NOT NULL,
  content     text NOT NULL,
  source      text DEFAULT 'yinez',
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_yinez_memory_tenant      ON public.yinez_memory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_yinez_memory_client      ON public.yinez_memory(client_id);
CREATE INDEX IF NOT EXISTS idx_yinez_memory_type        ON public.yinez_memory(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_yinez_memory_created_at  ON public.yinez_memory(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_yinez_memory_global      ON public.yinez_memory(tenant_id, type, created_at DESC)
  WHERE client_id IS NULL;

-- Seed from selena_memory (keeper types) so Yinez inherits institutional knowledge
-- per nycmaid migration logic. Skip 'issue' (stale) and 'self_review' (Selena-specific).
INSERT INTO public.yinez_memory (tenant_id, client_id, type, content, source, created_at)
SELECT tenant_id, client_id, type, content, COALESCE(source, 'selena_seed'), created_at
FROM public.selena_memory
WHERE type IN ('preference', 'observation', 'payment', 'instruction')
ON CONFLICT DO NOTHING;

-- ── 2. yinez_skills ──
CREATE TABLE IF NOT EXISTS public.yinez_skills (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name          text NOT NULL,
  when_to_use   text NOT NULL,
  body          text NOT NULL,
  active        boolean DEFAULT true,
  hit_count     int DEFAULT 0,
  created_by    text DEFAULT 'jeff',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_yinez_skills_active ON public.yinez_skills(tenant_id, active, name) WHERE active = true;

CREATE OR REPLACE FUNCTION public.yinez_skills_touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS yinez_skills_touch ON public.yinez_skills;
CREATE TRIGGER yinez_skills_touch
  BEFORE UPDATE ON public.yinez_skills
  FOR EACH ROW EXECUTE FUNCTION public.yinez_skills_touch_updated_at();
