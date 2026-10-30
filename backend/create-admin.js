const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // We pass the plain text string directly to the 'password' field to avoid variable mismatches
  const admin = await prisma.user.create({
    data: {
      email: 'admin@thinkzai.com',
      password: 'password123', 
      role: 'ADMIN'
    }
  });

  console.log('🚀 Admin account injected successfully into dev.db!');
  console.log('Email:', admin.email);
  console.log('Password: password123');
}

main()
  .catch((e) => console.error('Error creating admin:', e))
  .finally(async () => await prisma.$disconnect());