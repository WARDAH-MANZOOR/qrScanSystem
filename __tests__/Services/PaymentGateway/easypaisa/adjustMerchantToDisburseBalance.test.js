import axios from "axios";
import prisma from "../../../../dist/prisma/client.js";
import easyPaisaService from "../../../../dist/services/paymentGateway/easypaisa.js";

jest.mock("../../../../dist/prisma/client.js", () => ({
    merchant: {
        findFirst: jest.fn(),
        updateMany: jest.fn(),
    },
    easyPaisaMerchant: {
        findFirst: jest.fn(),
    },
    disbursement: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),  
    },
    $transaction: jest.fn(),
}));

describe("adjustMerchantToDisburseBalance", () => {
    const merchantId = "merchant123";
    const amount = 100;

    afterEach(() => {
        jest.clearAllMocks();
    });

    test("should increment balanceToDisburse when isIncrement is true", async () => {
        prisma.merchant.updateMany.mockResolvedValue({ count: 1 });

        const response = await easyPaisaService.adjustMerchantToDisburseBalance(merchantId, amount, true);
        
        expect(prisma.merchant.updateMany).toHaveBeenCalledWith({
            where: { uid: merchantId },
            data: { balanceToDisburse: { increment: amount } }
        });
        expect(response).toEqual({
            message: "Merchant balance updated successfully",
            obj: { count: 1 }
        });
    });

    test("should decrement balanceToDisburse when isIncrement is false", async () => {
        prisma.merchant.updateMany.mockResolvedValue({ count: 1 });

        const response = await easyPaisaService.adjustMerchantToDisburseBalance(merchantId, amount, false);
        
        expect(prisma.merchant.updateMany).toHaveBeenCalledWith({
            where: { uid: merchantId },
            data: { balanceToDisburse: { decrement: amount } }
        });
        expect(response).toEqual({
            message: "Merchant balance updated successfully",
            obj: { count: 1 }
        });
    });


});
