import { exportSettlement } from "../../../dist/services/settlement/index";
import prisma from "../../../dist/prisma/client";
import { Parser } from "json2csv";

jest.mock("../../../dist/prisma/client", () => ({
  settlementReport: {
    findMany: jest.fn(),
  },
}));

describe("exportSettlement", () => {
  let params, user, mockReports;

  beforeEach(() => {
    params = { start: "2024-02-01T00:00:00+00:00", end: "2024-02-02T23:59:59+00:00" };
    user = { merchant_id: 123, role: "Merchant" };
    mockReports = [
      {
        merchant: { uid: 123, full_name: "Test Merchant" },
        settlementDate: "2024-02-01T12:00:00+00:00",
        transactionCount: 10,
        transactionAmount: 1000,
        commission: 50,
        gst: 20,
        withholdingTax: 10,
        merchantAmount: 920,
      },
    ];
    prisma.settlementReport.findMany.mockResolvedValue(mockReports);
  });

  test("should return a CSV report with calculated total amount", async () => {
    const result = await exportSettlement(params, user);

    expect(prisma.settlementReport.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ merchant_id: 123 }),
      include: expect.any(Object),
    });

    const parser = new Parser({
      fields: [
        "merchant",
        "merchant_id",
        "settlement_date",
        "transaction_count",
        "transaction_amount",
        "commission",
        "gst",
        "withholding_tax",
        "merchant_amount",
      ],
    });
    const expectedCsv = parser.parse([
      {
        merchant: "Test Merchant",
        merchant_id: 123,
        settlement_date: "2024-02-01T12:00:00+00:00",
        transaction_count: 10,
        transaction_amount: 1000,
        commission: 50,
        gst: 20,
        withholding_tax: 10,
        merchant_amount: 920,
      },
    ]);

    expect(result).toBe(`${expectedCsv}\nTotal Settled Amount,,920`);
  });

  test("should throw an error if merchant ID is missing for non-admin users", async () => {
    const invalidUser = { role: "Merchant" };

    await expect(exportSettlement(params, invalidUser)).rejects.toThrow("Merchant ID is required");
  });

  it("should return empty CSV if no reports found", async () => {
    prisma.settlementReport.findMany.mockResolvedValue([]); // Return an empty array

    const params = { start: "2024-02-01T00:00:00Z", end: "2024-02-10T23:59:59Z" };
    const user = { role: "Admin", merchant_id: null }; // Admin user

    const result = await exportSettlement(params, user);

    // Expected CSV headers + total amount line
    const expectedOutput =
      `"merchant","merchant_id","settlement_date","transaction_count","transaction_amount","commission","gst","withholding_tax","merchant_amount"
Total Settled Amount,,0`;

    expect(result.trim()).toBe(expectedOutput);
  });
});
