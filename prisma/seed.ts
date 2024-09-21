import { PrismaClient } from '@prisma/client';
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
  // { name: "Reset API secured key" },
  // { name: "Manage stores and outlets" },
  { name: "Profile" },
  { name: "Reports" },
  { name: "Capture/Void Transactions" },
  { name: "Refund Purchase Transactions" },
  // { name: "Change secret word" },
  { name: "View/Manage Hold Transactions" },
  // { name: "View merchant domain" },
  { name: "Invoice Transactions" },

  // Raast Permissions
  // { name: "View Raast QR" },
  // { name: "View Raast QR Payments" },
  // { name: "View Raast Return Requests" },
];
async function main() {
  // await prisma.issuer.create({
  //   data: {
  //     issuer_name: 'Bank A',
  //   },
  // });

  // await prisma.transaction.create({
  //   data: {
  //     date_time: new Date(),
  //     amount: 100.00,
  //     issuer_id: 1,
  //     status: 'completed',
  //     type: 'purchase',
  //     response_message: 'Success',
  //     settlement: true,
  //   },
  // });
  console.log('Start seeding permissions...');
  for (const p of permissions) {
    await prisma.permission.create({
      data: p,
    });
  }
  console.log('Seeding finished.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
