import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    await prisma.issuer.create({
        data: {
            issuer_name: 'Bank A',
        },
    });
    await prisma.transaction.create({
        data: {
            date_time: new Date(),
            amount: 100.00,
            issuer_id: 1,
            status: 'completed',
            type: 'purchase',
            response_message: 'Success',
            settlement: true,
        },
    });
}
main()
    .catch(e => console.error(e))
    .finally(async () => {
    await prisma.$disconnect();
});
