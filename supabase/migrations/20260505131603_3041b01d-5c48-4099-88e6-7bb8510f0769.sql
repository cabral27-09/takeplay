CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _requested_role text;
  _role app_role;
  _full_name text;
  _avatar_url text;
BEGIN
  _requested_role := NEW.raw_user_meta_data ->> 'role';

  -- Whitelist: only allow viewer or producer from signup metadata.
  -- 'admin' can never be self-assigned; must be granted via admin panel.
  IF _requested_role = 'producer' THEN
    _role := 'producer'::app_role;
  ELSE
    _role := 'viewer'::app_role;
  END IF;

  _full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    NEW.raw_user_meta_data ->> 'email'
  );

  _avatar_url := COALESCE(
    NEW.raw_user_meta_data ->> 'avatar_url',
    NEW.raw_user_meta_data ->> 'picture'
  );

  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, _full_name, _avatar_url);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role);

  RETURN NEW;
END;
$function$;