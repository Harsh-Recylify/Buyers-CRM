import { pool } from "@workspace/db";

async function run() {
  const c = await pool.connect();
  try {
    const q = 'select "id", "name", "email", "password_hash", "role", "status", "phone", "department", "avatar", "reset_token", "reset_token_expiry", "last_login", "is_protected", "created_at", "updated_at" from "users" where "users"."email" = $1';
    const res = await c.query(q, ['harshjain@recyclify.in']);
    console.log("Query SUCCESS! Rows:", res.rows);
  } catch (err: any) {
    console.error("Query FAILED with error:", err.message);
    console.error("Error code:", err.code);
    console.error("Error detail:", err.detail);
    console.error("Error hint:", err.hint);
  } finally {
    c.release();
    await pool.end();
  }
}

run();
