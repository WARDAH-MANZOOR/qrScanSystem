import prisma from "../prisma/client.js";
import backofficeService from "../services/backoffice/backoffice.js";

const cleanupFailedAttempts = async () => {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  await prisma.failedAttempt.deleteMany({
    where: {
      failedAt: {
        lt: twoHoursAgo,
      },
    },
  },
  );
  console.log('Old failed attempts cleaned');
};

export default { cleanupFailedAttempts }
