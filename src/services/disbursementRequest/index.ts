import prisma from "prisma/client.js";
import { backofficeService } from "services/index.js";
import { getWalletBalance } from "services/paymentGateway/disbursement.js";
import CustomError from "utils/custom_error.js";

const createDisbursementRequest = async (requested_amount: number, merchant_id: number) => {
    try {
        return await prisma.disbursementRequest.create({
            data: {
                requestedAmount: requested_amount,
                merchantId: merchant_id,
                status: "pending"
            }
        });
    }
    catch (err: any) {
        throw new CustomError(err.message, 500);
    }
}

const updateDisbursementRequestStatus = async (requestId: number, status: string) => {
    try {
        const disbursementRequest = await prisma.disbursementRequest.update({
            where: { id: requestId },
            data: { status: status }
        });
        if (status == "approved") {
            const {walletBalance} = await getWalletBalance(disbursementRequest.merchantId) as {walletBalance: number};
            await prisma.merchant.update({
                where: { merchant_id: disbursementRequest.merchantId },
                data: { balanceToDisburse: {increment: Number(disbursementRequest.requestedAmount)} }
            });
            const updatedAvailableBalance = walletBalance - Number(disbursementRequest.requestedAmount);
            await backofficeService.adjustMerchantWalletBalance(disbursementRequest.merchantId, updatedAvailableBalance, false);
        }
        return {
            id: disbursementRequest.id,
            status: disbursementRequest.status
        }
    }
    catch (err: any) {
        throw new CustomError(err.message, 500);
    }
}

export default {
    createDisbursementRequest,
    updateDisbursementRequestStatus
}