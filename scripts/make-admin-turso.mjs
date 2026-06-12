import { createClient } from "@libsql/client";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const client = createClient({
  url: "libsql://bolao-copa-andersonmarc20.aws-us-east-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODEwMDYxMzMsImlkIjoiMDE5ZWFjM2MtNzMwMS03NzE5LThiZTItNmIyYmZjMzBmZGZjIiwicmlkIjoiOTllNGYyNTYtMDA0Ny00Y2NlLWE1NjgtMTliOTYyNzUxZWJjIn0.-0Pe_vBc0bA5nAb8I4FvaE361sRG4rsbEyWUO95RS0Umly5ehGzqPDUg5k0nEcX1dh69DXa-x50KKegrZjCGBw",
});

const email = process.argv[2] || "andersonmarc20@gmail.com";

const result = await client.execute({
  sql: "UPDATE user SET role = 'admin' WHERE email = ?",
  args: [email],
});

if (result.rowsAffected > 0) {
  console.log(`✅ ${email} agora é admin na produção!`);
} else {
  console.log(`❌ Usuário "${email}" não encontrado. Faça login primeiro no site de produção.`);
}

client.close();
