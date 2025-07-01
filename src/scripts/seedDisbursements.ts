import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function disableForeignKeys() {
  await prisma.$executeRawUnsafe(`SET session_replication_role = 'replica';`);
}

async function enableForeignKeys() {
  await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);
}

async function main() {
  const BATCH_SIZE = 5000;
  const TOTAL_RECORDS = 1000000;

  await disableForeignKeys();

  for (let i = 0; i < TOTAL_RECORDS / BATCH_SIZE; i++) {
  const now = new Date();

  // Generate a batch of transactions on the fly
  const batchTransactions = Array.from({ length: BATCH_SIZE }).map(() => {
    const amount =Number(faker.finance.amount({ min: 10, max: 10000, dec: 2 }));
    return {
      merchant_transaction_id: faker.string.numeric(7) + faker.string.alphanumeric(5),

      date_time: faker.date.recent(),
      original_amount: amount,
      merchant_id: faker.number.int({ min: 1, max: 100 }),
    };
  });

  // Generate disbursements based on batchTransactions
  const disbursements = batchTransactions.map((tx, index) => {
    const commission = Number((tx.original_amount * 0.05).toFixed(2));
    const gst = Number((commission * 0.18).toFixed(2));
    const withholdingTax = Number((commission * 0.1).toFixed(2));
    const merchantAmount = Number((tx.original_amount - commission - gst - withholdingTax).toFixed(2));

    return {
      transaction_id: tx.merchant_transaction_id,
      merchant_id: tx.merchant_id,
      disbursementDate: tx.date_time,
      transactionAmount: tx.original_amount,
      merchantAmount,
      commission,
      gst,
      withholdingTax,
      platform: Number((Math.random() * 100).toFixed(2)),
      account: faker.string.numeric(10),
      provider: faker.helpers.arrayElement(['JazzCash', 'Easypaisa']),
      to_provider: faker.helpers.arrayElement(['JazzCash', 'Easypaisa']),
      merchant_custom_order_id: faker.string.alphanumeric(10) + i + index,
      system_order_id: faker.string.alphanumeric(8),
      status: 'completed',
      response_message: 'success',
      callback_sent: faker.datatype.boolean(),
      callback_response: faker.lorem.words(3),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
  });

  await prisma.disbursement.createMany({
    data: disbursements,
    skipDuplicates: true,
  });

  console.log(`Inserted batch ${i + 1} with ${disbursements.length} disbursements`);
}

  await enableForeignKeys();
}

main()
  .then(() => console.log('Finished inserting 1000000 disbursement records!'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
