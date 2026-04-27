/**
 * Ejecuta todas las migrations pendientes en Supabase en orden correcto.
 * Uso: npx tsx scripts/run-migrations.ts
 * Requiere: SUPABASE_DB_PASSWORD en .env.local o como variable de entorno.
 */
import "dotenv/config";
import { Client } from "pg";
import { readFileSync } from "fs";
import { join } from "path";

const MIGRATIONS = [
  {
    archivo: "migration-fase5-metadatos-normas.sql",
    descripcion: "Fase 5 — columnas expandidas en normas + match_chunks inicial",
    verificacion: "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='normas' AND column_name='dominio'",
    resultadoEsperado: "1",
  },
  {
    archivo: "migration-match-chunks-v2.sql",
    descripcion: "match_chunks v2 — corrige filtro vigente=false",
    verificacion: null,
    resultadoEsperado: null,
  },
  {
    archivo: "migration-tabla-contacto.sql",
    descripcion: "Tabla contacto — formulario de reportes",
    verificacion: "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='contacto'",
    resultadoEsperado: "1",
  },
  {
    archivo: "migration-rpc-count-chunks.sql",
    descripcion: "RPC count_chunks_por_norma — optimización panel admin",
    verificacion: "SELECT COUNT(*) FROM pg_proc WHERE proname='count_chunks_por_norma'",
    resultadoEsperado: "1",
  },
];

async function main() {
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) {
    console.error("❌ Falta SUPABASE_DB_PASSWORD en .env.local");
    process.exit(1);
  }

  const host = "db.tmypbopdgodbolsjbush.supabase.co";
  console.log(`\n🗄️  Conectando a Supabase (${host})...\n`);

  const client = new Client({
    host,
    port: 5432,
    database: "postgres",
    user: "postgres",
    password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
  });

  try {
    await client.connect();
    console.log("✓ Conexión establecida\n");
  } catch (err) {
    console.error("❌ No se pudo conectar:", (err as Error).message);
    console.error("   Verifica que la contraseña sea correcta (Dashboard → Settings → Database)");
    process.exit(1);
  }

  let exitosos = 0;
  let fallidos = 0;

  for (const m of MIGRATIONS) {
    process.stdout.write(`  [${m.archivo.replace(".sql", "")}]\n  ${m.descripcion}\n  Ejecutando... `);

    try {
      const sql = readFileSync(join(__dirname, m.archivo), "utf-8");
      await client.query(sql);

      if (m.verificacion && m.resultadoEsperado) {
        const { rows } = await client.query(m.verificacion);
        const valor = String(Object.values(rows[0])[0]);
        if (valor !== m.resultadoEsperado) {
          throw new Error(`Verificación falló: esperaba ${m.resultadoEsperado}, obtuvo ${valor}`);
        }
      }

      console.log("✓ OK");
      exitosos++;
    } catch (err) {
      console.log("✗ ERROR");
      console.error(`  → ${(err as Error).message}\n`);
      fallidos++;
    }

    console.log();
  }

  await client.end();

  console.log("─".repeat(50));
  console.log(`  Resultado: ${exitosos}/${MIGRATIONS.length} migrations aplicadas`);
  if (fallidos > 0) {
    console.log(`  ⚠️  ${fallidos} migration(s) fallaron — revisa los errores arriba`);
    process.exit(1);
  } else {
    console.log("  ✅ Todas las migrations aplicadas correctamente");
  }
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
