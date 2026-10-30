const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Item 5: Fetch all user records
exports.getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany();

    res.status(200).json({
      success: true,
      users: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};