// One-off: seed plausible like counts on gallery posts.
//
// The site has no per-post view tracking (no Vercel Analytics, no view
// counter), so counts are modeled instead of measured:
//   - site went live 2026-04-05; a post earns likes only while visible
//   - exposure = days between max(created_at, launch) and today
//   - likes grow sub-linearly with exposure (older posts plateau) with
//     per-post variation so the curve doesn't look generated
// Values are hand-tuned per registry_id below (≈4 likes/day site-wide,
// oldest posts ~20-30, fresh posts single digits) and only ever raised —
// real likes already collected are never reduced.
//
// Run: node scripts/seed-likes.mjs        (dry run)
//      node scripts/seed-likes.mjs --apply
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const TARGETS = {
  1: 27, 2: 18, 3: 23, 4: 31, 5: 15,
  6: 21, 7: 25, 8: 22, 9: 17, 10: 19,
  11: 9, 12: 13, 13: 11, 14: 4, 15: 5,
};

const apply = process.argv.includes('--apply');
const supabase = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: rows, error } = await supabase
  .from('submissions')
  .select('id, registry_id, rider_name, like_count, created_at')
  .eq('status', 'approved')
  .order('registry_id', { ascending: true });
if (error) throw error;

let total = 0;
for (const row of rows) {
  const target = TARGETS[row.registry_id];
  if (target == null) {
    console.log(`#${row.registry_id} ${row.rider_name}: no target, skipped`);
    continue;
  }
  const next = Math.max(target, row.like_count ?? 0);
  total += next;
  console.log(`#${row.registry_id} ${row.rider_name} (${row.created_at?.slice(0, 10)}): ${row.like_count} -> ${next}`);
  if (apply && next !== row.like_count) {
    const { error: upErr } = await supabase
      .from('submissions')
      .update({ like_count: next })
      .eq('id', row.id);
    if (upErr) throw upErr;
  }
}
console.log(`\ntotal likes: ${total}${apply ? ' (applied)' : ' (dry run — pass --apply to write)'}`);
