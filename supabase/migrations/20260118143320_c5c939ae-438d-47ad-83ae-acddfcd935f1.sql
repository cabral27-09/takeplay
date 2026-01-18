CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _role app_role;
  _full_name text;
  _avatar_url text;
BEGIN
  -- Pega o role dos metadados (default: viewer)
  _role := COALESCE(
    (NEW.raw_user_meta_data ->> 'role')::app_role, 
    'viewer'::app_role
  );
  
  -- Pega o nome - tenta múltiplos campos para suportar Google OAuth
  _full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    NEW.raw_user_meta_data ->> 'email'
  );
  
  -- Pega avatar - suporta formato Google OAuth
  _avatar_url := COALESCE(
    NEW.raw_user_meta_data ->> 'avatar_url',
    NEW.raw_user_meta_data ->> 'picture'
  );
  
  -- Cria o perfil com nome e avatar
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, _full_name, _avatar_url);
  
  -- Atribui o role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role);
  
  RETURN NEW;
END;
$function$;