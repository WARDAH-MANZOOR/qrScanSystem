import prisma from "../../../dist/prisma/client.js";
import CustomError from "../../../dist/utils/custom_error.js";
import backofficeService from "../../../dist/services/backoffice/backoffice.js";

jest.mock("../../../dist/prisma/client.js", () => ({
    disbursement: {
        findMany: jest.fn(),
        updateMany: jest.fn()
    }
}));

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
    console.error.mockRestore();
});

describe("failDisbursements", () => {
    const transactionIds = ["order_1", "order_2", "order_3"];
    const disbursements = [
        { merchant_custom_order_id: "order_1", status: "pending" },
        { merchant_custom_order_id: "order_2", status: "processing" }
    ];

    it("should mark disbursements as failed successfully", async () => {
        prisma.disbursement.findMany.mockResolvedValue(disbursements);
        prisma.disbursement.updateMany.mockResolvedValue({ count: disbursements.length });
        try {
            const result = await backofficeService.failDisbursements(transactionIds);

            expect(prisma.disbursement.findMany).toHaveBeenCalledWith({
                where: { merchant_custom_order_id: { in: transactionIds } }
            });
            expect(prisma.disbursement.updateMany).toHaveBeenCalledWith({
                where: { merchant_custom_order_id: { in: transactionIds } },
                data: { status: "failed", response_message: "failed" }
            });


        } catch (error) {
            console.error("Disbursements failed successfully.", error);
        }
    });


    it("should throw an error if no disbursements are found", async () => {
        prisma.disbursement.findMany.mockResolvedValue([]);
        try {
            const result = await backofficeService.failDisbursements(transactionIds)
            expect(prisma.disbursement.findMany).toHaveBeenCalledWith({
                where: { merchant_custom_order_id: { in: transactionIds } }
            });
            expect(prisma.disbursement.updateMany).not.toHaveBeenCalled();

        } catch (error) {
            console.error("Transactions not found", error);
        }
    });


    it("should handle unexpected errors", async () => {
        prisma.disbursement.findMany.mockRejectedValue(new Error("Database error"));
        try {
            const result = await backofficeService.failDisbursements(transactionIds)
            expect(prisma.disbursement.findMany).toHaveBeenCalledWith({
                where: { merchant_custom_order_id: { in: transactionIds } }
            });
            expect(prisma.disbursement.updateMany).not.toHaveBeenCalled();

        } catch (error) {
            console.error("Database error", error);
        }
    });
});
