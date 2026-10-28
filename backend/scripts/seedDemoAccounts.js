require('dotenv').config();

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const DEMO_PASSWORD = process.env.DEMO_ACCOUNT_PASSWORD;

// These are deliberately local demonstration accounts. The script is
// idempotent: re-running it only resets these exact accounts and no others.
const accounts = [
  { name: 'System Administrator', email: 'admin@thinkzai.com', role: 'Admin' },
  { name: 'Instructor Demo', email: 'instructordemo@gmail.com', role: 'Instructor' },
  { name: 'Teaching Assistant Demo', email: 'tademo@gmail.com', role: 'TA' },
  { name: 'Demo Learner', email: 'ta.demo.learner@thinkz.local', role: 'Learner' },
];

async function seedDemoAccounts() {
  if (!DEMO_PASSWORD || DEMO_PASSWORD.length < 8) {
    throw new Error('Set DEMO_ACCOUNT_PASSWORD to a temporary password with at least 8 characters.');
  }
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const account of accounts) {
    await prisma.user.upsert({
      where: { email: account.email },
      update: { name: account.name, role: account.role, password },
      create: { ...account, password },
    });
    console.log(`Ready: ${account.role} — ${account.email}`);
  }
  console.log('Demo accounts are ready. The password remains only in your local PowerShell session.');
}

seedDemoAccounts()
  .catch((error) => {
    console.error('Could not seed demo accounts:', error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
