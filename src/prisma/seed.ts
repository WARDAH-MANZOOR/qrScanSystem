import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
const prisma = new PrismaClient();

const permissions = [
  // User Management Permissions
  { name: "Portal users list" },
  { name: "Create portal user" },
  { name: "Update portal user" },
  { name: "Create user group" },
  { name: "Update user group" },
  { name: "View all user groups" },
  { name: "View Group List" },

  // Back Office Permissions
  { name: "Transactions List" },
  { name: "Profile" },
  { name: "Reports" },
  { name: "Capture/Void Transactions" },
  { name: "Refund Purchase Transactions" },
  { name: "View/Manage Hold Transactions" },
  { name: "Invoice Transactions" },
  { name: "View Available Balance" },
  { name: "Disbursement" }
];

async function seed() {
  try {
    console.log('Start seeding permissions...');

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
    const group = await prisma.group.create({
      data: {
        name: 'Admin',
        users: {
          create: users.map((user) => ({
            user: { connect: { id: user.id } },
            merchant: { connect: { merchant_id: user.merchant_id } }
          })),
        },
        
      },
    });

    // Seed transactions
    const transactions = [];
    for (let i = 0; i < 20; i++) {
      const merchant = merchants[i % merchants.length];
      const user = users[i % users.length];
      transactions.push(
        await prisma.transaction.create({
          data: {
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
    for (const p of permissions) {
      await prisma.permission.create({
        data: p,
      });
    }
    console.log('Seed completed!');
  } catch (error) {
    console.error('Error while seeding:', error);
  }
}

seed()
