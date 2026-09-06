import { pool } from "@workspace/db";

async function check() {
  const c = await pool.connect();
  try {
    const res = await c.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' ORDER BY ordinal_position"
    );
    console.log("PUBLIC.USERS columns in Supabase:");
    console.table(res.rows);
  } catch (e: any) {
    console.error("Error:", e.message);
  } finally {
    c.release();
    await pool.end();
  }
}

check();
