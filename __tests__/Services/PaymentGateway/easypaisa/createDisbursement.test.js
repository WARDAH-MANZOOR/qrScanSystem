import easyPaisaService from "../../../../dist/services/paymentGateway/easypaisa.js";
import { merchantService } from "../../../../dist/services/index.js";
import axios from "axios";

import { easyPaisaDisburse } from "../../../../dist/services/index.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import prisma from "../../../../dist/prisma/client.js";
import {
  calculateDisbursement,
  getEligibleTransactions,
  getMerchantRate,
} from "../../../../dist/services/paymentGateway/disbursement.js";
const { Decimal } = require("decimal.js");

jest.mock("../../../../dist/services/index.js");
jest.mock("../../../../dist/prisma/client.js", () => ({
  disbursement: {
    create: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback()), // Mocking Prisma's $transaction
}));

  jest.mock("../../../../dist/services/paymentGateway/disbursement.js", () => ({
  getEligibleTransactions: jest.fn(),
  getMerchantRate: jest.fn(),
  calculateDisbursement: jest.fn(),
}));

const mockCorporateLogin = jest.fn();
const mockCreateRSAEncryptedPayload = jest.fn();
const mockAxiosPost = jest.fn();

jest.mock("axios", () => ({
  post: mockAxiosPost,
}));

describe("createDisbursement", () => {
  let mockMerchant;
  let mockDisburseAccount;
  let mockRate;
  let mockTransactions;
  let mockResponse;

  beforeEach(() => {
    mockMerchant = {
      uid: "merchant1",
      merchant_id: 123,
      EasyPaisaDisburseAccountId: "account1",
      callback_mode: "SINGLE",
      payout_callback: "http://example.com/callback",
      webhook_url: "http://example.com/webhook",
      encrypted: false,
    };

    mockDisburseAccount = {
      MSISDN: "923000000000",
      clientId: "client-id",
      clientSecret: "client-secret",
      xChannel: "channel-x",
    };

    mockRate = {
      disbursementRate: new Decimal(0.1),
      disbursementGST: new Decimal(0.05),
      disbursementWithHoldingTax: new Decimal(0.02),
    };

    mockTransactions = [
      {
        transaction_id: 1,
        settled_amount: new Decimal(1000),
        original_amount: new Decimal(1000),
        balance: new Decimal(500),
      },
      {
        transaction_id: 2,
        settled_amount: new Decimal(2000),
        original_amount: new Decimal(2000),
        balance: new Decimal(1500),
      },
    ];

    mockResponse = {
      ResponseCode: 0,
      TransactionReference: "ref123",
      TransactionStatus: "SUCCESS",
      Fee: 10,
    };

    easyPaisaDisburse.getDisburseAccount.mockResolvedValue({ data: mockDisburseAccount });
    getMerchantRate.mockResolvedValue(mockRate);
    getEligibleTransactions.mockResolvedValue(mockTransactions);
    mockAxiosPost.mockResolvedValue({ data: mockResponse });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should throw error if merchant is not found", async () => {
    merchantService.findOne.mockResolvedValue(null);

    await expect(
      easyPaisaService.createDisbursement({ phone: "923000000000", amount: 1000 }, "merchant1")
    ).rejects.toThrowError("Merchant not found");
  });

  it("should throw error if EasyPaisaDisburseAccountId is not assigned", async () => {
    mockMerchant.EasyPaisaDisburseAccountId = null;
    merchantService.findOne.mockResolvedValue(mockMerchant);

    await expect(
      easyPaisaService.createDisbursement({ phone: "923000000000", amount: 1000 }, "merchant1")
    ).rejects.toThrowError("Disbursement account not assigned.");
  });

  it("should throw error if disbursement account is not found", async () => {
    easyPaisaDisburse.getDisburseAccount.mockResolvedValue(null);
    merchantService.findOne.mockResolvedValue(mockMerchant);

    await expect(
      easyPaisaService.createDisbursement({ phone: "923000000000", amount: 1000 }, "merchant1")
    ).rejects.toThrowError("Disbursement account not found");
  });

  it("should throw error if phone number does not start with 92", async () => {
    merchantService.findOne.mockResolvedValue(mockMerchant);

    await expect(
      easyPaisaService.createDisbursement({ phone: "911234567890", amount: 1000 }, "merchant1")
    ).rejects.toThrowError("Number should start with 92");
  });

  it("should throw error if no eligible transactions are found", async () => {
    getEligibleTransactions.mockResolvedValue([]);
    merchantService.findOne.mockResolvedValue(mockMerchant);

    await expect(
      easyPaisaService.createDisbursement({ phone: "923000000000", amount: 1000 }, "merchant1")
    ).rejects.toThrowError("No eligible transactions to disburse");
  });


  it("should throw error for unexpected exceptions", async () => {
    getMerchantRate.mockRejectedValue(new Error("Unexpected error"));
    merchantService.findOne.mockResolvedValue(mockMerchant);

    await expect(
      easyPaisaService.createDisbursement({ phone: "923000000000", amount: 1000 }, "merchant1")
    ).rejects.toThrowError("Unexpected error");
  });
});
