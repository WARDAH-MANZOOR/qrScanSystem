import easyPaisaService from "../../../../dist/services/paymentGateway/easypaisa.js";
import { merchantService, easyPaisaDisburse } from "../../../../dist/services/index.js";
import { CustomError } from "../../../../dist/utils/custom_error.js";
import axios from "axios";
import prisma from "../../../../dist/prisma/client.js";
import { Decimal } from "@prisma/client/runtime/library";

// Mock necessary modules
jest.mock("axios");
jest.mock("../../../../dist/prisma/client.js");
jest.mock("../../../../dist/services/index.js");
jest.mock("../../../../dist/utils/custom_error.js");

// Mock banks.json data
jest.mock(
  "data/banks.json",
  () => [
    { BankName: "Bank A", BankTitle: "Bank A Title", BankShortName: "BA" },
    { BankName: "Bank B", BankTitle: "Bank B Title", BankShortName: "BB" },
  ],
  { virtual: true }
);

jest.mock("../../../../dist/utils/custom_error.js", () => {
  return jest.fn().mockImplementation((message, statusCode) => ({
    message,
    statusCode,
  }));
});

jest.mock("axios", () => ({
  request: jest.fn(),
}));

jest.mock("../../../../dist/prisma/client.js", () => ({
  transaction: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(),
}));

jest.mock("../../../../dist/services/index.js", () => ({
  merchantService: {
    findOne: jest.fn(),
  },
  easyPaisaDisburse: {
    getDisburseAccount: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks(); // Reset mock state before each test
  jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
  jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

afterEach(() => {
  console.error.mockRestore(); // Restore console.error after tests
});
describe("disburseThroughBank", () => {
  const merchantId = 123;
  const obj = {
    amount: 1000,
    accountNo: "123456789",
    phone: "3001234567",
    purpose: "Payment",
    bankName: "Bank A",
    order_id: "order123",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully disburse funds through a valid bank", async () => {
    try{
    const mockMerchant = {
      EasyPaisaDisburseAccountId: "account123",
      merchant_id: 1,
    };

    const mockDisburseAccount = {
      MSISDN: "3001234567",
      clientId: "client-id",
      clientSecret: "client-secret",
      xChannel: "channel",
    };

    const rate = {
      disbursementRate: new Decimal(0.02),
      disbursementGST: new Decimal(0.01),
      disbursementWithHoldingTax: new Decimal(0.05),
    };

    const transactions = [
      { transaction_id: "txn1", balance: new Decimal(1000), settled_amount: new Decimal(1000) },
    ];

    merchantService.findOne.mockResolvedValue(mockMerchant);
    easyPaisaDisburse.getDisburseAccount.mockResolvedValue({ data: mockDisburseAccount });
    prisma.transaction.findMany.mockResolvedValue(transactions);
    prisma.$transaction.mockResolvedValue({
      transaction_id: "txn1",
      merchant_custom_order_id: "order123",
    });
    axios.request.mockResolvedValueOnce({ data: { ResponseCode: "0", Name: "John Doe", Branch: "Main", Username: "jdoe", ReceiverIBAN: "PK123" } });
    axios.request.mockResolvedValueOnce({ data: { ResponseCode: "0", TransactionReference: "ref123" } });

    const response = await easyPaisaService.disburseThroughBank(obj, merchantId);

    expect(response.transaction_id).toBe("ref123");
    expect(response.merchant_custom_order_id).toBe("order123");
  }   catch (error) {
    console.error('Error', error);
  }
  });

  it("should throw an error if merchant is not found", async () => {
    merchantService.findOne.mockResolvedValue(null);
    try{

      await easyPaisaService.disburseThroughBank(obj, merchantId)

    } catch(error){
      console.error("Merchant not found", error)
    }
  });

  it("should throw an error if disbursement account is not assigned", async () => {
    const mockMerchant = { EasyPaisaDisburseAccountId: null };

    merchantService.findOne.mockResolvedValue(mockMerchant);
    try{

      await easyPaisaService.disburseThroughBank(obj, merchantId)

    } catch(error){
      console.error("Disbursement account not assigned.", error)
    }
  });

  it("should throw an error if disbursement account is not found", async () => {
    const mockMerchant = { EasyPaisaDisburseAccountId: "account123" };

    merchantService.findOne.mockResolvedValue(mockMerchant);
    easyPaisaDisburse.getDisburseAccount.mockResolvedValue(null);
    try{

      await easyPaisaService.disburseThroughBank(obj, merchantId)

    } catch(error){
      console.error("Disbursement account not found", error)
    }
  });

  it("should throw an error if bank is not found", async () => {
    const mockMerchant = { EasyPaisaDisburseAccountId: "account123" };
    const objWithInvalidBank = { ...obj, bankName: "NonExistentBank" };

    merchantService.findOne.mockResolvedValue(mockMerchant);
    try{

      await easyPaisaService.disburseThroughBank(objWithInvalidBank, merchantId)

    } catch(error){
      console.error("Bank not found", error)
    }
  });

  it("should throw an error if no eligible transactions are found", async () => {
    const mockMerchant = {
      EasyPaisaDisburseAccountId: "account123",
      merchant_id: 1,
    };

    merchantService.findOne.mockResolvedValue(mockMerchant);
    easyPaisaDisburse.getDisburseAccount.mockResolvedValue({ data: {} });
    prisma.transaction.findMany.mockResolvedValue([]);
    try{

      await easyPaisaService.disburseThroughBank(obj, merchantId)

    } catch(error){
      console.error("No eligible transactions to disburse", error)
    }
  });

  it("should throw an error if transfer inquiry fails", async () => {
    const mockMerchant = {
      EasyPaisaDisburseAccountId: "account123",
      merchant_id: 1,
    };

    const mockDisburseAccount = {
      MSISDN: "3001234567",
      clientId: "client-id",
      clientSecret: "client-secret",
      xChannel: "channel",
    };

    merchantService.findOne.mockResolvedValue(mockMerchant);
    easyPaisaDisburse.getDisburseAccount.mockResolvedValue({ data: mockDisburseAccount });
    prisma.transaction.findMany.mockResolvedValue([{ transaction_id: "txn1", balance: new Decimal(1000) }]);
    axios.request.mockResolvedValueOnce({ data: { ResponseCode: "1" } });
    try{

      await easyPaisaService.disburseThroughBank(obj, merchantId)

    } catch(error){
      console.error("Error conducting transfer inquiry", error)
    }
  });

  it("should throw an error if transfer fails", async () => {
    const mockMerchant = {
      EasyPaisaDisburseAccountId: "account123",
      merchant_id: 1,
    };

    const mockDisburseAccount = {
      MSISDN: "3001234567",
      clientId: "client-id",
      clientSecret: "client-secret",
      xChannel: "channel",
    };

    merchantService.findOne.mockResolvedValue(mockMerchant);
    easyPaisaDisburse.getDisburseAccount.mockResolvedValue({ data: mockDisburseAccount });
    prisma.transaction.findMany.mockResolvedValue([{ transaction_id: "txn1", balance: new Decimal(1000) }]);
    axios.request.mockResolvedValueOnce({ data: { ResponseCode: "0", Name: "John Doe", Branch: "Main", Username: "jdoe", ReceiverIBAN: "PK123" } });
    axios.request.mockResolvedValueOnce({ data: { ResponseCode: "1" } });
    try{

      await easyPaisaService.disburseThroughBank(obj, merchantId)

    } catch(error){
      console.error("Error conducting transfer inquiry", error)
    }
  });
});
