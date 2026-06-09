/**
 * Promote a user to admin role.
 * Usage: node scripts/make-admin.mjs <email>
 * Example: node scripts/make-admin.mjs andersonmarc20@gmail.com
 */

import { createClient } from "@libsql/client";

const email = process.argv[2];

if (!email) {
  console.error("Usage: node scripts/make-admin.mjs <email>");
  process.exit(1);
}

const client = createClient({ url: "file:./dev.db" });

const result = await client.execute({
  sql: "UPDATE user SET role = 'admin' WHERE email = ?",
  args: [email],
});

if (result.rowsAffected > 0) {
  console.log(`✅ ${email} agora é admin!`);
} else {
  console.log(`❌ Usuário com email "${email}" não encontrado.`);
}

client.close();
