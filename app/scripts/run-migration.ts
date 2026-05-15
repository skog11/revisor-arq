import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase
    .from("rate_limits")
    .upsert({ ip: "__test__", timestamps: [], updated_at: new Date().toISOString() }, { onConflict: "ip" });

  if (error) {
    console.log("❌ Tabla rate_limits no existe:", error.message);
    console.log("\nEjecuta este SQL en Supabase Dashboard → SQL Editor:\n");
    console.log(`CREATE TABLE IF NOT EXISTS public.rate_limits (
    ip TEXT PRIMARY KEY,
    timestamps BIGINT[] DEFAULT '{}'::BIGINT[],
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;`);
  } else {
    await supabase.from("rate_limits").delete().eq("ip", "__test__");
    console.log("✅ Tabla rate_limits operativa — migración ya aplicada");
  }
}

main().catch(console.error);
