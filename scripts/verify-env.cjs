/* eslint-disable no-console */

function required(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) return { ok: false, value: v };
  return { ok: true, value: v };
}

const requiredVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
const missing = requiredVars.map(required).map((r, i) => ({ name: requiredVars[i], ...r })).filter((r) => !r.ok);

if (missing.length) {
  console.error('\n[Lucraí] Build bloqueado: variáveis de ambiente do Supabase ausentes.\n');
  for (const m of missing) console.error(`- ${m.name} (vazio/ausente)`);
  console.error('\nComo resolver no Vercel: Project → Settings → Environment Variables');
  console.error('- VITE_SUPABASE_URL=https://<ref>.supabase.co');
  console.error('- VITE_SUPABASE_ANON_KEY=sb_publishable_...');
  console.error('\nImportante: em Vite, VITE_* é injetado no build. Faça um Redeploy após salvar.');
  console.error('');
  process.exit(1);
}


