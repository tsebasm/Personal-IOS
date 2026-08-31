// Elimina todos los datos de demostración (is_demo=true) de la cuenta
// autenticada, sin tocar ningún dato real.
//
// Uso: node --env-file=.env.local scripts/seed-reset.mjs

import { getSeedClient, deleteDemoData } from "./lib/supabase-client.mjs";

async function main() {
  console.log("Iniciando sesión…");
  const { supabase } = await getSeedClient();

  console.log("Borrando datos demo…");
  await deleteDemoData(supabase);

  console.log("\nListo. La cuenta quedó como antes del seed.");
}

main().catch((err) => {
  console.error(`\nError: ${err.message}`);
  // process.exitCode (not process.exit()) — forcing immediate termination
  // while supabase-js's internal HTTP handle is still open crashes libuv on
  // Windows (UV_HANDLE_CLOSING assertion). This lets Node shut down cleanly.
  process.exitCode = 1;
});
