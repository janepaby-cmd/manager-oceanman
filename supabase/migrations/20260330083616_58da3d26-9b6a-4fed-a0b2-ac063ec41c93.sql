
-- 1. Función SECURITY DEFINER para verificar si dos usuarios comparten proyecto
CREATE OR REPLACE FUNCTION public.is_project_colleague(_user_id uuid, _colleague_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_users pu1
    JOIN public.project_users pu2 ON pu1.project_id = pu2.project_id
    WHERE pu1.user_id = _user_id
      AND pu2.user_id = _colleague_id
  )
$$;

-- 2. Managers pueden ver todos los perfiles (necesario para gestión de proyectos y mensajería)
CREATE POLICY "Managers can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

-- 3. Users pueden ver perfiles de compañeros de proyecto
CREATE POLICY "Users view project colleague profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_project_colleague(auth.uid(), user_id));

-- 4. Users pueden ver perfiles de participantes en sus mensajes
CREATE POLICY "Users view message participant profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.message_recipients mr1
    JOIN public.message_recipients mr2 ON mr1.message_id = mr2.message_id
    WHERE mr1.recipient_user_id = auth.uid()
      AND mr2.recipient_user_id = profiles.user_id
  )
  OR
  EXISTS (
    SELECT 1
    FROM public.messages m
    JOIN public.message_recipients mr ON mr.message_id = m.id
    WHERE mr.recipient_user_id = auth.uid()
      AND m.sender_user_id = profiles.user_id
  )
  OR
  EXISTS (
    SELECT 1
    FROM public.messages m
    JOIN public.message_recipients mr ON mr.message_id = m.id
    WHERE m.sender_user_id = auth.uid()
      AND mr.recipient_user_id = profiles.user_id
  )
);
