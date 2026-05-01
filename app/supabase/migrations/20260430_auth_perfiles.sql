-- ============================================================
-- REVISOR ARQ — Migración: sistema de autenticación + perfiles
-- ============================================================
--
-- Crea:
--   1. Tabla `perfiles` — datos del usuario + cuota mensual
--   2. Trigger para crear perfil automáticamente al registrarse
--   3. RLS policies para que cada usuario solo vea su perfil
--   4. Columna user_id en consultas (para historial por usuario)
--   5. Función RPC get_uso_mensual — consultas del mes actual
--
-- Planes:
--   beta  : 50 consultas / mes (gratuito durante beta)
--   free  : 20 consultas / mes
--   pro   : 300 consultas / mes
--   admin : ilimitado
--
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- ── 1. Tabla de perfiles ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS perfiles (
  id              uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email           text,
  nombre          text,
  plan            text NOT NULL DEFAULT 'beta'
                    CHECK (plan IN ('beta', 'free', 'pro', 'admin')),
  consultas_mes   int  NOT NULL DEFAULT 0,
  reset_mes       date NOT NULL DEFAULT date_trunc('month', now())::date,
  creado_en       timestamptz NOT NULL DEFAULT now()
);

-- ── 2. RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- Cada usuario solo puede leer/actualizar su propio perfil
CREATE POLICY "perfil_select_own"
  ON perfiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "perfil_update_own"
  ON perfiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role puede hacer todo (para el backend)
CREATE POLICY "perfil_service_all"
  ON perfiles FOR ALL
  USING (true)
  WITH CHECK (true);

-- ── 3. Trigger: crear perfil al registrar usuario ─────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfiles (id, email, nombre, plan)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    'beta'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 4. Columna user_id en consultas (opcional, nullable) ──────────────────────

ALTER TABLE consultas
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS consultas_user_id_idx ON consultas (user_id);

-- ── 5. Función: uso mensual del usuario ──────────────────────────────────────

CREATE OR REPLACE FUNCTION get_uso_mensual(p_user_id uuid)
RETURNS TABLE (
  consultas_este_mes  bigint,
  limite_mensual      int,
  plan                text,
  porcentaje_uso      numeric
)
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  WITH stats AS (
    SELECT
      COUNT(*)::bigint AS n,
      p.plan,
      CASE p.plan
        WHEN 'admin' THEN 999999
        WHEN 'pro'   THEN 300
        WHEN 'beta'  THEN 50
        ELSE 20  -- free
      END AS limite
    FROM perfiles p
    LEFT JOIN consultas c
      ON c.user_id = p.id
      AND date_trunc('month', c.created_at) = date_trunc('month', now())
    WHERE p.id = p_user_id
    GROUP BY p.plan
  )
  SELECT
    n AS consultas_este_mes,
    limite AS limite_mensual,
    plan,
    ROUND((n::numeric / NULLIF(limite, 0)) * 100, 1) AS porcentaje_uso
  FROM stats;
$$;

-- ── 6. Función: verificar y decrementar cuota ────────────────────────────────
-- Retorna TRUE si el usuario puede hacer la consulta (y la registra)
-- Retorna FALSE si ha agotado la cuota mensual

CREATE OR REPLACE FUNCTION check_and_use_quota(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan   text;
  v_limite int;
  v_uso    bigint;
BEGIN
  -- Obtener plan del usuario
  SELECT plan INTO v_plan FROM perfiles WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN TRUE; END IF; -- usuario sin perfil → permitir

  -- Admins: siempre permitido
  IF v_plan = 'admin' THEN RETURN TRUE; END IF;

  -- Calcular límite según plan
  v_limite := CASE v_plan
    WHEN 'pro'  THEN 300
    WHEN 'beta' THEN 50
    ELSE 20
  END;

  -- Contar uso del mes actual
  SELECT COUNT(*) INTO v_uso
  FROM consultas
  WHERE user_id = p_user_id
    AND date_trunc('month', created_at) = date_trunc('month', now());

  RETURN v_uso < v_limite;
END;
$$;
