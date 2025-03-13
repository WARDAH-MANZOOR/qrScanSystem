import { Prisma, PrismaClient } from '@prisma/client';
import retry from 'async-retry'
async function prismaRetry<T>(fn: () => Promise<T>): Promise<T> {
    return retry(async (bail): Promise<T> => { // explicitly specify Promise<T>
        try {
            return await fn();
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    bail(error);
                    throw error; // explicitly throw to satisfy type T
                }
            }
            console.warn('Prisma operation failed, retrying...', error);
            throw error; // retry for other errors
        }
    }, {
        retries: 5,
        minTimeout: 1000,
        maxTimeout: 5000,
        factor: 2,
    });
}
const prisma = new PrismaClient();
// prisma.$use(async (params, next) => {
//     return prismaRetry(() => next(params));
// })
export default prisma;