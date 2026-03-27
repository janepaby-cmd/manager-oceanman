
-- Allow superadmins to delete profiles
CREATE POLICY "Superadmins can delete profiles" ON public.profiles
  FOR DELETE USING (public.has_role(auth.uid(), 'superadmin'));

-- Allow admins to manage roles too
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
