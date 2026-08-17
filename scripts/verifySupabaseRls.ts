import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL('../supabase/migrations/20260817_create_user_app_data.sql', import.meta.url),
  'utf8'
);

assert.match(migration, /enable row level security/i);
assert.match(migration, /revoke all on table public\.user_app_data from anon/i);
assert.match(migration, /for select[\s\S]*auth\.uid\(\)[\s\S]*user_id/i);
assert.match(migration, /for insert[\s\S]*with check[\s\S]*auth\.uid\(\)[\s\S]*user_id/i);
assert.match(migration, /for update[\s\S]*using[\s\S]*with check[\s\S]*auth\.uid\(\)[\s\S]*user_id/i);
assert.match(migration, /for delete[\s\S]*auth\.uid\(\)[\s\S]*user_id/i);

console.log('RLS verificado: usuarios anónimos bloqueados y operaciones limitadas a auth.uid().');
