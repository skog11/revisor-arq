import { Client } from "pg";
import { readFileSync } from "fs";
import { join } from "path";
import * as readline from "readline";

async function askPassword(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    // Disable echo for password input
    const muted = { muted: false };
    const origWrite = (rl as any).output.write.bind((rl as any).output);
    (rl as any).output.write = (s: string) => {
      if (!muted.muted) origWrite(s);
    };
    rl.question("Contraseña de Supabase (postgres): ", (answer) => {
      origWrite("\n");
      rl.close();
      resolve(answer);
    });
    muted.muted = true;
  });
}

async function main() {
  const password = await askPassword();

  const client = new Client({
    host: "db.tmypbopdgodbolsjbush.supabase.co",
    port: 5432,
    database: "postgres",
    user: "postgres",
    password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  console.log("\nConectando a Supabase...");
  await client.connect();
  console.log("Conexión exitosa.");

  const schemaPath = join(__dirname, "schema.sql");
  const sql = readFileSync(schemaPath, "utf-8");

  console.log("Aplicando schema.sql...");
  await client.query(sql);
  console.log("Schema aplicado correctamente.");

  await client.end();
  console.log("\nListo. Tablas creadas: normas, articulos, chunks, consultas, evaluaciones");
}

main().catch((err) => {
  console.error("\nError:", err.message);
  process.exit(1);
});
