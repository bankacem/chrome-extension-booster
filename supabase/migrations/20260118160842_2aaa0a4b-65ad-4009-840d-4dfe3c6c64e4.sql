-- 1) Roles table (used to secure admin/dashboard access)
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID NOT NULL PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'editor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can read their own role
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Bootstrap: allow the *first* authenticated user to become admin
DROP POLICY IF EXISTS "Bootstrap first admin" ON public.user_roles;
CREATE POLICY "Bootstrap first admin"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'admin'
  AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
);

-- Admins can manage roles (after bootstrap)
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles r
    WHERE r.user_id = auth.uid() AND r.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles r
    WHERE r.user_id = auth.uid() AND r.role = 'admin'
  )
);


-- 2) Fix articles RLS: current policies are restrictive-only, so INSERT/UPDATE/DELETE are blocked.
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage all articles" ON public.articles;
DROP POLICY IF EXISTS "Anyone can view published articles" ON public.articles;
DROP POLICY IF EXISTS "Admins can manage articles" ON public.articles;
DROP POLICY IF EXISTS "Public can view published articles" ON public.articles;

-- Public read (blog)
CREATE POLICY "Public can view published articles"
ON public.articles
FOR SELECT
TO anon, authenticated
USING (
  (status = 'published')
  AND (published_at IS NULL OR published_at <= now())
);

-- Admin CRUD (dashboard)
CREATE POLICY "Admins can manage articles"
ON public.articles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles r
    WHERE r.user_id = auth.uid() AND r.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles r
    WHERE r.user_id = auth.uid() AND r.role = 'admin'
  )
);
