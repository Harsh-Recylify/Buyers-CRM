import { pool } from "@workspace/db";
import bcrypt from "bcryptjs";

async function check() {
  const c = await pool.connect();
  try {
    const res = await c.query("SELECT * FROM users WHERE email = 'harshjain@recyclify.in'");
    if (res.rows.length === 0) {
      console.log("User not found!");
      return;
    }
    const u = res.rows[0];
    console.log("User found:", u.email, "Name:", u.name, "Status:", u.status);
    const valid = await bcrypt.compare("Recyclify@2024", u.password_hash);
    console.log("Recyclify@2024 valid?:", valid);
    
    // Check login_logs table
    const logs = await c.query("SELECT COUNT(*) FROM login_logs");
    console.log("login_logs table exists! Count:", logs.rows[0].count);

    // Check activity_logs table
    const acts = await c.query("SELECT COUNT(*) FROM activity_logs");
    console.log("activity_logs table exists! Count:", acts.rows[0].count);
  } catch (e: any) {
    console.error("Error during check:", e.message);
  } finally {
    c.release();
    await pool.end();
  }
}

check();
