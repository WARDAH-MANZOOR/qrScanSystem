import axios from "axios";
import prisma from "../../../../dist/prisma/client.js";
import easyPaisaService from "../../../../dist/services/paymentGateway/easypaisa.js";
import CustomError from "../../../../dist/utils/custom_error.js";

jest.mock("axios");

jest.mock("../../../../dist/prisma/client.js", () => ({
    merchant: {
      findFirst: jest.fn(),
    },
    easyPaisaMerchant: {
      findFirst: jest.fn(),
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

describe("easypaisainquiry", () => {
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("Successful API Call (Valid Response)", async () => {
    const param = { orderId: "12345" };
    const merchantId = "valid_merchant_id";
    
    // Mock the Prisma and Axios responses
    prisma.merchant.findFirst.mockResolvedValue({
        easyPaisaMerchant: {
            storeId: "store123",
            accountNumber: "account123",
            username: "validUsername",
            credentials: "validCredentials"
        }
    });
    axios.request.mockResolvedValue({
        data: {
            responseCode: "0000",
            orderId: "12345",
            transactionStatus: "Success",
            transactionAmount: "1000",
            transactionDateTime: "2024-12-17T10:00:00",
            msisdn: "3001234567",
            responseDesc: "Transaction Successful"
        }
    });

    const result = await easyPaisaService.easypaisainquiry(param, merchantId);

    expect(result).toEqual({
        orderId: "12345",
        transactionStatus: "Success",
        transactionAmount: "1000",
        transactionDateTime: "2024-12-17T10:00:00",
        msisdn: "3001234567",
        responseDesc: "Transaction Successful",
        responseMode: "MA"
    });
  });

 
  test("API Timeout or Network Error", async () => {
    const param = { orderId: "12345" };
    const merchantId = "valid_merchant_id";

    prisma.merchant.findFirst.mockResolvedValue({
        easyPaisaMerchant: {
            storeId: "store123",
            accountNumber: "account123",
            username: "validUsername",
            credentials: "validCredentials"
        }
    });
    axios.request.mockRejectedValue(new Error("Network Error"));

    await expect(easyPaisaService.easypaisainquiry(param, merchantId))
        .rejects
        .toThrowError(new Error("Network Error"));
  });

  test("Invalid Response Code (Transaction Not Found)", async () => {
    const param = { orderId: "12345" };
    const merchantId = "valid_merchant_id";
    
    prisma.merchant.findFirst.mockResolvedValue({
        easyPaisaMerchant: {
            storeId: "store123",
            accountNumber: "account123",
            username: "validUsername",
            credentials: "validCredentials"
        }
    });
    axios.request.mockResolvedValue({
        data: {
            responseCode: "9999", // Invalid response code
            orderId: "12345",
            transactionStatus: "Failed",
            transactionAmount: "0",
            transactionDateTime: "2024-12-17T10:00:00",
            msisdn: "3001234567",
            responseDesc: "Transaction Failed"
        }
    });

    const result = await easyPaisaService.easypaisainquiry(param, merchantId);

    expect(result).toEqual({
        message: "Transaction Not Found",
        statusCode: 500
    });
  });

  test("Valid API Response with Unexpected Values", async () => {
    const param = { orderId: "12345" };
    const merchantId = "valid_merchant_id";
    
    prisma.merchant.findFirst.mockResolvedValue({
        easyPaisaMerchant: {
            storeId: "store123",
            accountNumber: "account123",
            username: "validUsername",
            credentials: "validCredentials"
        }
    });
    axios.request.mockResolvedValue({
        data: {
            responseCode: "0000",
            orderId: "12345",
            transactionStatus: "Success",
            transactionAmount: "999999999999", // Very large amount
            transactionDateTime: "2024-12-17T10:00:00",
            msisdn: "3001234567",
            responseDesc: "Transaction Successful"
        }
    });

    const result = await easyPaisaService.easypaisainquiry(param, merchantId);

    expect(result.transactionAmount).toBe("999999999999");
  });
});
