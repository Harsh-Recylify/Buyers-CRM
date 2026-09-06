import { pool } from "@workspace/db";

async function testAll() {
  const DATABASE_URL = process.env.DATABASE_URL;
  const SESSION_SECRET = process.env.SESSION_SECRET;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  const CORS_ORIGIN = process.env.CORS_ORIGIN;

  console.log("=== ENV VARIABLE CHECK ===");
  console.log("DATABASE_URL      :", DATABASE_URL ? "✅ Set" : "❌ MISSING");
  console.log("SESSION_SECRET    :", SESSION_SECRET ? "✅ Set" : "❌ MISSING");
  console.log("SUPABASE_URL      :", SUPABASE_URL ? "✅ Set → " + SUPABASE_URL : "⚠️  Not set (optional for this app)");
  console.log("SUPABASE_ANON_KEY :", SUPABASE_ANON_KEY ? "✅ Set" : "⚠️  Not set (optional for this app)");
  console.log("CORS_ORIGIN       :", CORS_ORIGIN ? "✅ Set → " + CORS_ORIGIN : "⚠️  Not set (allows all origins)");

  const weakSecret = !SESSION_SECRET || SESSION_SECRET === "recyclify-local-dev-jwt-signing-key-2026" || SESSION_SECRET === "recyclify-secret-key";
  if (weakSecret) {
    console.log("\n⚠️  WARNING: SESSION_SECRET is using a weak/dev value. Must be changed for production on Render/Vercel!");
  }

  console.log("\n=== SUPABASE DB CONNECTION TEST ===");
  try {
    const client = await pool.connect();
    const res = await client.query("SELECT COUNT(*) as user_count FROM users");
    client.release();
    console.log("✅ Supabase DB connected successfully!");
    console.log("   Users in DB:", res.rows[0].user_count);
  } catch (err: any) {
    console.log("❌ Supabase DB Connection FAILED!");
    console.log("   Error:", err.message);
    if (err.code === "ENOTFOUND") {
      console.log("   → The DB host is not reachable. Check if Supabase project is paused or the URL is wrong.");
    } else if (err.code === "28P01") {
      console.log("   → Authentication failed. Password in DATABASE_URL is incorrect.");
    } else if (err.code === "3D000") {
      console.log("   → Database does not exist.");
    }
  } finally {
    await pool.end().catch(() => {});
  }
}

testAll();
