-- Harden privileged content-generation data paths.
-- seo_agent_memory is only used by the admin SEO generator, so it must not be
-- readable or writable by every authenticated user.
ALTER TABLE public.seo_agent_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read agent memory" ON public.seo_agent_memory;
DROP POLICY IF EXISTS "Authenticated users can insert agent memory" ON public.seo_agent_memory;
DROP POLICY IF EXISTS "Admins can read agent memory" ON public.seo_agent_memory;
DROP POLICY IF EXISTS "Admins can insert agent memory" ON public.seo_agent_memory;

CREATE POLICY "Admins can read agent memory"
  ON public.seo_agent_memory
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert agent memory"
  ON public.seo_agent_memory
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- Keep public image delivery, but restrict mutations to administrators.
DROP POLICY IF EXISTS "Authenticated users can upload article images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update article images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload article images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update article images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete article images" ON storage.objects;

CREATE POLICY "Admins can upload article images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'article-images'
    AND public.is_admin(auth.uid())
  );

CREATE POLICY "Admins can update article images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'article-images'
    AND public.is_admin(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'article-images'
    AND public.is_admin(auth.uid())
  );

CREATE POLICY "Admins can delete article images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'article-images'
    AND public.is_admin(auth.uid())
  );
