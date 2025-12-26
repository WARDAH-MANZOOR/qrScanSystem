import cron from 'node-cron';
import { backofficeService } from 'services/index.js';
import prisma from '../prisma/client.js';

async function settleAllInstantMerchants() {
    try {
      const merchants = await prisma.merchant.findMany({
        where: { isInstantSettlement: true },
        select: { merchant_id: true }
      });
      console.log(merchants)
      for (const merchant of merchants) {
        try {
          await backofficeService.settleAllMerchantTransactions(Number(merchant.merchant_id));
          console.log(`Settled transactions for merchant ${merchant.merchant_id}`);
        } catch (err) {
          console.error(`Failed to settle for merchant ${merchant.merchant_id}:`, err);
        }
      }
      console.log("All instant settlement merchants processed.");
    } catch (err) {
      console.error("Error in settleAllInstantMerchants cron:", err);
    }
  }
// Schedule to run at 12:00 AM and 12:00 PM every day
const instantSettlementCron = async () => {
  console.log('[CRON] Starting instant settlement for all eligible merchants...');
  await settleAllInstantMerchants();
  console.log('[CRON] Finished instant settlement for all eligible merchants.');
};

export default instantSettlementCron; 