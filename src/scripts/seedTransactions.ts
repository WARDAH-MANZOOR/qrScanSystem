// import { PrismaClient, TransactionStatus } from '@prisma/client';
// import { faker } from '@faker-js/faker';
// import { Decimal } from '@prisma/client/runtime/library';

// const prisma = new PrismaClient();

// async function main() {
//   const BATCH_SIZE = 1000;
//   const TOTAL_RECORDS = 50000;

//   // Fetch valid merchants and customers
//   const merchants = await prisma.merchant.findMany({
//     where: {
//       merchant_id: { in: [3, 7, 8, 9, 11, 12] },
//     },
//   });
//   const merchantIds = merchants.map(m => m.merchant_id);

//   // Fetch existing customers (users)
//   const customers = await prisma.user.findMany({
//     select: { id: true },
//   });
//   const customerIds = customers.map((c) => c.id);

//   for (let i = 0; i < TOTAL_RECORDS / BATCH_SIZE; i++) {
//     const batch = Array.from({ length: BATCH_SIZE }, () => {
//       const amount = Number(faker.finance.amount({ min: 10, max: 10000, dec: 2 }));
//       const now = new Date();
//       const providerDetails = {
//         id: faker.number.int({ min: 1, max: 5 }),
//         name: faker.helpers.arrayElement(['Easypaisa', 'JazzCash']),
//         msisdn: '03' + faker.string.numeric(9),
//       };

//       return {
//         transaction_id: `T${faker.date.recent().getTime()}${faker.string.alphanumeric(5)}`,
//         date_time: faker.date.recent(),
//         original_amount: new Decimal(amount),
//         status: faker.helpers.arrayElement([
//           TransactionStatus.failed,
//           TransactionStatus.completed,
//           TransactionStatus.pending,
//         ]),
//         type: faker.helpers.arrayElement(['wallet', 'bank', 'card']),
//         response_message: faker.helpers.arrayElement([
//           'INVALID STORE ID',
//           'SUCCESS',
//           'TIMEOUT',
//           'NETWORK ERROR',
//         ]),
//         settlement: faker.datatype.boolean(),
//         settled_amount: new Decimal(amount - 1),
//         balance: new Decimal(amount - 2),
//         merchant_id: faker.helpers.arrayElement(merchantIds),
//         customer_id: faker.datatype.boolean() ? faker.helpers.arrayElement(customerIds) : null,
//         providerId: faker.number.int({ min: 1, max: 10 }),
//         createdAt: now,
//         providerDetails,
//         updatedAt: now,
//         merchant_transaction_id: faker.string.numeric(7),
//         callback_response: null,
//         callback_sent: false,
//       };
//     });

//     await prisma.transaction.createMany({
//       data: batch,
//     });

//     console.log(`Inserted batch ${i + 1}`);
//   }
// }
import { PrismaClient, TransactionStatus } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function disableForeignKeys() {
  await prisma.$executeRawUnsafe(`SET session_replication_role = 'replica';`);
}

async function enableForeignKeys() {
  await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);
}

async function main() {
  const BATCH_SIZE = 1000;
  const TOTAL_RECORDS = 50000;

  await disableForeignKeys();

  for (let i = 0; i < TOTAL_RECORDS / BATCH_SIZE; i++) {
    const batch = Array.from({ length: BATCH_SIZE }, (_, idx) => {
      const amount = Number(faker.finance.amount({ min: 10, max: 10000, dec: 2 }));
      const now = new Date();
      const providerDetails = {
        id: faker.number.int({ min: 1, max: 5 }),
        name: faker.helpers.arrayElement(['Easypaisa', 'JazzCash']),
        msisdn: '03' + faker.string.numeric(9),
      };

      return {
        transaction_id: `T${faker.date.recent().getTime()}${faker.string.alphanumeric(5)}`,
        date_time: faker.date.recent(),
        original_amount: new Decimal(amount),
        status: faker.helpers.arrayElement([
          TransactionStatus.failed,
          TransactionStatus.completed,
          TransactionStatus.pending,
        ]),
        type: faker.helpers.arrayElement(['wallet', 'bank', 'card']),
        response_message: faker.helpers.arrayElement([
          'INVALID STORE ID',
          'SUCCESS',
          'TIMEOUT',
          'NETWORK ERROR',
        ]),
        settlement: faker.datatype.boolean(),
        settled_amount: new Decimal(amount - 1),
        balance: new Decimal(amount - 2),
        merchant_id: faker.number.int({ min: 1, max: 100 }),
        customer_id: faker.datatype.boolean() ? faker.number.int({ min: 1, max: 1000 }) : null,
        providerId: faker.number.int({ min: 1, max: 10 }),
        createdAt: now,
        providerDetails,
        updatedAt: now,
        // UNIQUE merchant_transaction_id using batch and index:
        merchant_transaction_id: `MTX${i * BATCH_SIZE + idx}`,
        callback_response: null,
        callback_sent: false,
      };
    });

    await prisma.transaction.createMany({
      data: batch,
    });

    console.log(`Inserted batch ${i + 1}`);
  }

  await enableForeignKeys();
}

main()
  .then(() => {
    console.log('Finished inserting 50,000 transactions!');
  })
  .catch((err) => {
    console.error(err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
