require("dotenv").config();

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
    log: ["query", "info", "warn", "error"],
});

async function connectDB() {
    try {
        await prisma.$connect();
        console.log("✅ Prisma Connected Successfully");
    } catch (error) {
        console.error("❌ Prisma Connection Failed");
        console.error(error);
        // Socket-only verification does not require PostgreSQL. This opt-in
        // mode is intentionally disabled in normal development and production.
        if (process.env.ALLOW_DB_OFFLINE === "true") {
            console.warn("⚠️ Continuing without PostgreSQL because ALLOW_DB_OFFLINE=true");
            return;
        }
        process.exit(1);
    }
}

connectDB();

module.exports = prisma;
