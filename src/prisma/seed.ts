import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
const prisma = new PrismaClient();

const permissions = [
  // User Management Permissions
  { id: 1,name: "Portal users list" },
  { id: 2,name: "Create portal user" },
  { id: 3,name: "Update portal user" },
  { id: 4,name: "Create user group" },
  { id: 5,name: "Update user group" },
  { id: 6,name: "View all user groups" },
  { id: 7,name: "View Group List" },

  // Back Office Permissions
  { id: 8,name: "Transactions List" },
  { id: 9,name: "Profile" },
  { id: 10,name: "Reports" },
  { id: 11,name: "Capture/Void Transactions" },
  { id: 12,name: "Refund Purchase Transactions" },
  { id: 13,name: "View/Manage Hold Transactions" },
  { id: 14,name: "Invoice Transactions" },
  { id: 15,name: "View Available Balance" },
  { id: 16,name: "Disbursement" }
];

async function seed() {
  try {
    console.log('Start seeding permissions...');
    for (const p of permissions) {
      await prisma.permission.create({
        data: p,
      });
    }
    // Seed merchants
    const merchants = [];
    for (let i = 0; i < 5; i++) {
      merchants.push(
        await prisma.merchant.create({
          data: {
            full_name: faker.company.name(),
            phone_number: faker.phone.number(),
            email: faker.internet.email(),
            company_name: faker.company.name(),
            company_url: faker.internet.url(),
            city: faker.location.city(),
            payment_volume: parseFloat(faker.finance.amount({ min: 1000, max: 50000, dec: 2 })),
          },
        })
      );
    }

    // Seed users and associate with merchants
    const users = [];
    for (let i = 0; i < 10; i++) {
      const merchant = merchants[i % merchants.length];
      users.push(
        await prisma.user.create({
          data: {
            username: faker.internet.userName(),
            email: faker.internet.email(),
            password: faker.internet.password(),
            age: faker.number.int({ min: 18, max: 60 }),
            merchant: {
              connect: { merchant_id: merchant.merchant_id },
            },
          },
        })
      );
    }

    // Seed groups and associate users with groups
    const admin = await prisma.group.create({
      data:
      {
        name: 'Admin',
        users: {
          create: users.map((user) => ({
            user: { connect: { id: user.id } },
            merchant: { connect: { merchant_id: user.merchant_id } }
          })),
        },
      }
    });

    const merchant = await prisma.group.create({
      data:
      {
        name: 'Merchant',
        users: {
          create: users.map((user) => ({
            user: { connect: { id: user.id } },
            merchant: { connect: { merchant_id: user.merchant_id } }
          })),
        },
      }
    });

    const groupPermissions = [
      { groupId: admin.id, permissionId: 1 },
      { groupId: admin.id, permissionId: 2 },
      { groupId: admin.id, permissionId: 3 },
      { groupId: admin.id, permissionId: 4 },
      { groupId: admin.id, permissionId: 5 },
      { groupId: admin.id, permissionId: 6 },
      { groupId: admin.id, permissionId: 7 },
      { groupId: admin.id, permissionId: 8 },
      { groupId: admin.id, permissionId: 9 },
      { groupId: admin.id, permissionId: 10 },
      { groupId: admin.id, permissionId: 11 },
      { groupId: admin.id, permissionId: 12 },
      { groupId: admin.id, permissionId: 13 },
      { groupId: admin.id, permissionId: 14 },
      { groupId: merchant.id, permissionId: 1 },
      { groupId: merchant.id, permissionId: 2 },
      { groupId: merchant.id, permissionId: 3 },
      { groupId: merchant.id, permissionId: 4 },
      { groupId: merchant.id, permissionId: 5 },
      { groupId: merchant.id, permissionId: 6 },
      { groupId: merchant.id, permissionId: 7 },
      { groupId: merchant.id, permissionId: 8 },
      { groupId: merchant.id, permissionId: 9 },
      { groupId: merchant.id, permissionId: 10 },
      { groupId: merchant.id, permissionId: 11 },
      { groupId: merchant.id, permissionId: 12 },
      { groupId: merchant.id, permissionId: 13 },
      { groupId: merchant.id, permissionId: 14 },
    ];
  
    // Seed the group-permission relationships
    await prisma.groupPermission.createMany({
      data: groupPermissions,
      skipDuplicates: true, // Skip if the relation already exists
    });

    // Seed transactions
    const transactions = [];
    for (let i = 0; i < 20; i++) {
      const merchant = merchants[i % merchants.length];
      const user = users[i % users.length];
      transactions.push(
        await prisma.transaction.create({
          data: {
            transaction_id: "T"+faker.string.fromCharacters(['0','1','2','3','4','5','6','7','8','9'],8),
            date_time: faker.date.recent(),
            original_amount: parseFloat(faker.finance.amount({ min: 1000, max: 50000, dec: 2 })),
            status: 'completed',
            type: 'wallet',
            response_message: faker.lorem.sentence(),
            settlement: faker.datatype.boolean(),
            settled_amount: parseFloat(faker.finance.amount({ min: 1000, max: 50000, dec: 2 })),
            merchant: {
              connect: { id: merchant.merchant_id },
            },
          },
        })
      );
    }

    // Seed scheduled tasks
    for (let i = 0; i < 5; i++) {
      await prisma.scheduledTask.create({
        data: {
          transactionId: transactions[i].transaction_id,
          status: 'pending',
          scheduledAt: faker.date.soon(),
          executedAt: faker.date.future(),
        },
      });
    }
    console.log('Seed completed!');
  } catch (error) {
    console.error('Error while seeding:', error);
  }
}

seed()
