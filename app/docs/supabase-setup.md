# Configurar Supabase — pasos manuales

## 1. Ejecutar el schema

1. Abre https://supabase.com y entra a tu proyecto **revisor-arq**.
2. En el menú lateral izquierdo haz clic en **SQL Editor**.
3. Haz clic en **New query** (botón superior derecho).
4. Abre el archivo `scripts/schema.sql` (en la raíz del proyecto) y copia todo su contenido.
5. Pega el contenido en el editor de Supabase.
6. Haz clic en **Run** (o presiona `Ctrl+Enter`).
7. Deberías ver el mensaje `Success. No rows returned.`

## 2. Verificar que las tablas se crearon

1. En el menú lateral, haz clic en **Table Editor**.
2. Deberías ver estas tablas:
   - `normas`
   - `articulos`
   - `chunks`
   - `consultas`
   - `evaluaciones`

Si ves las tablas, el schema quedó bien aplicado.

## 3. Probar la conexión desde tu computador

Con el servidor detenido, abre una terminal, navega a la carpeta `app/` y ejecuta:

```bash
npm run test:connection
```

Deberías ver:

```
Supabase... ✓ OK
Gemini...   ✓ OK — ok
Voyage...   ✓ OK — dim=1024

3/3 servicios OK
```

Si alguno falla, copia el error completo y pégalo en Claude Code.

## 4. Posibles errores comunes

**"relation does not exist"** → El schema no se ejecutó todavía. Ve al paso 1.

**"invalid API key"** → Revisa que `.env.local` tenga las claves correctas sin espacios extra.

**"fetch failed"** → Problema de red. Verifica que tienes internet y que la URL de Supabase es correcta.
