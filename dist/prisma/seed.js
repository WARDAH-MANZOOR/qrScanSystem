// // import { PrismaClient } from '@prisma/client';
// // const prisma = new PrismaClient();
export {};
// import prisma from "./client.js";
// // const permissions = [
// //   // User Management Permissions
// //   { id: 1, name: "Portal users list" },
// //   { id: 2, name: "Create portal user" },
// //   { id: 3, name: "Update portal user" },
// //   { id: 4, name: "Create user group" },
// //   { id: 5, name: "Update user group" },
// //   { id: 6, name: "View all user groups" },
// //   { id: 7, name: "View Group List" },
// //   // Back Office Permissions
// //   { id: 8, name: "Transactions List" },
// //   { id: 9, name: "Profile" },
// //   { id: 10, name: "Reports" },
// //   { id: 11, name: "Capture/Void Transactions" },
// //   { id: 12, name: "Refund Purchase Transactions" },
// //   { id: 13, name: "View/Manage Hold Transactions" },
// //   { id: 14, name: "Invoice Transactions" },
// //   { id: 15, name: "View Available Balance" },
// //   { id: 16, name: "Disbursement" },
// //   {id: 17, name: "Pay"},
// // ];
// // async function seed() {
// //   try {
// //     console.log('Start seeding permissions...');
// //     for (const p of permissions) {
// //       await prisma.permission.create({
// //         data: p,
// //       });
// //     }
// //     // Seed groups and associate users with groups
// //     const admin = await prisma.group.create({
// //       data:
// //       {
// //         name: 'Admin',
// //       }
// //     });
// //     console.log(admin.id)
// //     const merchant = await prisma.group.create({
// //       data:
// //       {
// //         name: 'Merchant',
// //       }
// //     });
// //     const customer = await prisma.group.create({
// //       data: {
// //         name: "Customer"
// //       }
// //     })
// //     const groupPermissions = [
// //       { groupId: admin.id, permissionId: 1 },
// //       { groupId: admin.id, permissionId: 2 },
// //       { groupId: admin.id, permissionId: 3 },
// //       { groupId: admin.id, permissionId: 4 },
// //       { groupId: admin.id, permissionId: 5 },
// //       { groupId: admin.id, permissionId: 6 },
// //       { groupId: admin.id, permissionId: 7 },
// //       { groupId: admin.id, permissionId: 8 },
// //       { groupId: admin.id, permissionId: 9 },
// //       { groupId: admin.id, permissionId: 10 },
// //       { groupId: admin.id, permissionId: 11 },
// //       { groupId: admin.id, permissionId: 12 },
// //       { groupId: admin.id, permissionId: 13 },
// //       { groupId: admin.id, permissionId: 14 },
// //       { groupId: merchant.id, permissionId: 1 },
// //       { groupId: merchant.id, permissionId: 2 },
// //       { groupId: merchant.id, permissionId: 3 },
// //       { groupId: merchant.id, permissionId: 4 },
// //       { groupId: merchant.id, permissionId: 5 },
// //       { groupId: merchant.id, permissionId: 6 },
// //       { groupId: merchant.id, permissionId: 7 },
// //       { groupId: merchant.id, permissionId: 8 },
// //       { groupId: merchant.id, permissionId: 9 },
// //       { groupId: merchant.id, permissionId: 10 },
// //       { groupId: merchant.id, permissionId: 11 },
// //       { groupId: merchant.id, permissionId: 12 },
// //       { groupId: merchant.id, permissionId: 13 },
// //       { groupId: merchant.id, permissionId: 14 },
// //       {groupId: customer.id, permissionId: 17}
// //     ];
// //     // Seed the group-permission relationships
// //     console.log("Group Permissions");
// //     await prisma.groupPermission.createMany({
// //       data: groupPermissions,
// //       skipDuplicates: true, // Skip if the relation already exists
// //     });
// //     let user = await prisma.user.create({
// //       data: {
// //         username: "Devtects",
// //         email: "devtects@gmail.com",
// //         password: "$2b$10$x.aFQ5yogpciQROeYls/ouVXDt4Czv5xWWrfelgoIL4AjZgl9Guv6",
// //       }
// //     })
// //     await prisma.userGroup.create({
// //       data: {
// //         userId: user.id,
// //         groupId: admin.id,
// //         // merchantId: user.id
// //       }
// //     })
// //     console.log('Seed completed!');
// //   } catch (error) {
// //     console.error('Error while seeding:', error);
// //   }
// // }
// // seed()
// import {
//   CallbackMode,
//   EasypaisaInquiryMethod,
//   EasypaisaPaymentMethodEnum,
//   PrismaClient,
//   TransactionStatus,
//   TransactionType,
// } from '@prisma/client';
// import { faker } from '@faker-js/faker';
// const prisma = new PrismaClient();
// async function main() {
//   // Fetch existing merchants (replace merchant_ids accordingly)
//   const merchants = await prisma.merchant.findMany({
//     where: {
//       merchant_id: { in: [3, 7, 8, 9, 11, 12] },
//     },
//   });
//   const merchantIds = merchants.map((m) => m.merchant_id);
//   // Fetch existing customers (users)
//   const customers = await prisma.user.findMany({
//     select: { id: true },
//   });
//   const customerIds = customers.map((c) => c.id);
//   const TOTAL_TRANSACTIONS = 50000;
//   const BATCH_SIZE = 200;
//   for (let i = 0; i < TOTAL_TRANSACTIONS / BATCH_SIZE; i++) {
//     // Create transactions
//     const transactions = Array.from({ length: BATCH_SIZE }, () => {
//       const amount = Number(faker.finance.amount({ min: 10, max: 10000, dec: 2 }));
//       const merchantId = faker.helpers.arrayElement(merchantIds);
//       const customerId = faker.helpers.arrayElement(customerIds); // Use real customer ids
//       const providerName = faker.helpers.arrayElement(['JazzCash', 'Easypaisa']);
//       const dateTime = faker.date.between({ from: '2023-01-01', to: '2025-01-01' });
//       return {
//         date_time: dateTime,
//         original_amount: amount,
//         status: faker.helpers.arrayElement(['pending', 'completed', 'failed']) as TransactionStatus,
//         type: faker.helpers.arrayElement(['wallet', 'card', 'bank']) as TransactionType,
//         response_message: faker.lorem.sentence(),
//         settlement: faker.datatype.boolean(),
//         settled_amount: amount - 5,
//         balance: amount - 10,
//         merchant_transaction_id: faker.string.uuid(),
//         merchant_id: merchantId,
//         customer_id: customerId,
//         providerDetails: {
//           id: faker.number.int({ min: 1, max: 99 }),
//           name: providerName,
//           msisdn: '03' + faker.string.numeric(9),
//         },
//         callback_sent: faker.datatype.boolean(),
//         callback_response: faker.lorem.words(3),
//         providerId: faker.number.int({ min: 1, max: 10 }),
//       };
//     });
//     // Insert transactions
//     await prisma.transaction.createMany({ data: transactions, skipDuplicates: true });
//     console.log(`Inserted ${(i + 1) * BATCH_SIZE} transactions`);
//     // Create disbursements linked to the transactions
//     const disbursements = transactions.map((tx) => {
//       const commission = Number((tx.original_amount * 0.05).toFixed(2)); // 5%
//       const gst = Number((commission * 0.18).toFixed(2)); // 18% GST
//       const withholdingTax = Number((commission * 0.1).toFixed(2)); // 10% WHT
//       const merchantAmount = Number((tx.original_amount - commission - gst - withholdingTax).toFixed(2));
//       return {
//         transaction_id: tx.merchant_transaction_id,
//         merchant_id: tx.merchant_id,
//         disbursementDate: tx.date_time,
//         transactionAmount: tx.original_amount,
//         merchantAmount,
//         commission,
//         gst,
//         withholdingTax,
//         platform: Number((Math.random() * 100).toFixed(2)),
//         account: faker.string.numeric(),
//         provider: faker.helpers.arrayElement(['JazzCash', 'Easypaisa']),
//         to_provider: faker.helpers.arrayElement(['JazzCash', 'Easypaisa']),
//         merchant_custom_order_id: faker.string.alphanumeric(10),
//         system_order_id: faker.string.alphanumeric(8),
//         status: 'completed',
//         response_message: 'success',
//         callback_sent: faker.datatype.boolean(),
//         callback_response: faker.lorem.words(3),
//       };
//     });
//     // Insert disbursements
//     await prisma.disbursement.createMany({ data: disbursements, skipDuplicates: true });
//     console.log(`Inserted ${(i + 1) * BATCH_SIZE} disbursements`);
//   }
// }
// main()
//   .then(() => {
//     console.log('Seeding complete!');
//   })
//   .catch((err) => {
//     console.error('Seeding error:', err);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
