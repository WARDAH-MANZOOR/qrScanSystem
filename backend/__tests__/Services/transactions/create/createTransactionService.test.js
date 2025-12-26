import { createTransactionService } from "../../../../dist/services/transactions/create.js"
import prisma from "../../../../dist/prisma/client.js"
jest.mock("../../../../dist/prisma/client.js", () => ({
  merchantFinancialTerms: {
    findUnique: jest.fn(),
  },
  transaction: {
    create: jest.fn(),
  },
  settlementReport: {
    upsert: jest.fn(),
  },
}));

describe("createTransactionService", () => {
  it("should create a transaction and update settlement report", async () => {
    // Mock Merchant Financial Terms
    prisma.merchantFinancialTerms.findUnique.mockResolvedValue({
      commissionRate: 0.05, // 5% commission
      commissionGST: 0.02,  // 2% GST
      commissionWithHoldingTax: 0.01, // 1% withholding tax
    });

    const body = { merchant_id: 123, original_amount: 1000 };

    const expectedCommission = 0.05 * body.original_amount;
    const expectedGST = 0.02 * body.original_amount;
    const expectedWithholdingTax = 0.01 * body.original_amount;
    const expectedMerchantAmount = body.original_amount - expectedCommission - expectedGST - expectedWithholdingTax;

    // Mock Transaction Creation
    prisma.transaction.create.mockResolvedValue({
      merchant_id: body.merchant_id,
      original_amount: body.original_amount,
      status: "completed",
      type: "wallet",
      date_time: expect.any(Date),
      settlement: true,
      balance: expectedMerchantAmount,
    });

    // Mock Settlement Upsert
    prisma.settlementReport.upsert.mockResolvedValue({
      merchant_id: body.merchant_id,
      settlementDate: expect.any(Date),
      transactionCount: 1,
      transactionAmount: body.original_amount,
      commission: expectedCommission,
      gst: expectedGST,
      withholdingTax: expectedWithholdingTax,
      merchantAmount: expectedMerchantAmount,
    });

    const result = await createTransactionService(body);

    expect(result.transaction).toEqual({
      merchant_id: body.merchant_id,
      original_amount: body.original_amount,
      status: "completed",
      type: "wallet",
      date_time: expect.any(Date),
      settlement: true,
      balance: expectedMerchantAmount,
    });

    expect(result.settlement).toEqual({
      merchant_id: body.merchant_id,
      settlementDate: expect.any(Date),
      transactionCount: 1,
      transactionAmount: body.original_amount,
      commission: expectedCommission,
      gst: expectedGST,
      withholdingTax: expectedWithholdingTax,
      merchantAmount: expectedMerchantAmount,
    });
  });

  it("should handle errors and return them", async () => {
    prisma.merchantFinancialTerms.findUnique.mockRejectedValue(new Error("Database error"));

    const body = { merchant_id: 123, original_amount: 1000 };

    const result = await createTransactionService(body);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("Database error");
  });
});
