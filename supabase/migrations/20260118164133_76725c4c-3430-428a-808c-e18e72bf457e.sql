-- Drop all existing policies on user_roles to fix infinite recursion
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Bootstrap first admin" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Drop all existing policies on articles
DROP POLICY IF EXISTS "Public can view published articles" ON public.articles;
DROP POLICY IF EXISTS "Admins can manage articles" ON public.articles;

-- Create a security definer function to check admin status without recursion
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  );
$$;

-- Create a security definer function to check if any admin exists
CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'admin'
  );
$$;

-- Recreate user_roles policies using the security definer functions
CREATE POLICY "Users can view own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Bootstrap first admin"
ON public.user_roles
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND role = 'admin'
  AND NOT public.admin_exists()
);

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Recreate articles policies using the security definer function
CREATE POLICY "Public can view published articles"
ON public.articles
FOR SELECT
USING (
  status = 'published'
  AND (published_at IS NULL OR published_at <= now())
);

CREATE POLICY "Admins can manage articles"
ON public.articles
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Insert the first admin directly since bootstrap policy wasn't working
-- This uses a manual insert that bypasses RLS temporarily
INSERT INTO public.user_roles (user_id, role)
SELECT '500126a3-7352-4b72-bf1f-93470b830694', 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = '500126a3-7352-4b72-bf1f-93470b830694'
);