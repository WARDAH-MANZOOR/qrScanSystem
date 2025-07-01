import { disburseTransactions } from "../../../../dist/controller/paymentGateway/disbursement.js";
import { validationResult } from "express-validator";
import { getEligibleTransactions, updateTransactions, getMerchantRate, calculateDisbursement } from "../../../../dist/services/paymentGateway/disbursement.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import CustomError from "../../../../dist/utils/custom_error.js";
const Decimal = require('decimal.js');

// Mock services and utilities
jest.mock("../../../../dist/services/paymentGateway/disbursement.js");
jest.mock("express-validator");

// Mock the Decimal class to avoid errors related to it
jest.mock('decimal.js', () => {
  return jest.fn().mockImplementation((value) => ({
    toString: jest.fn(() => value.toString()),
    valueOf: jest.fn(() => parseFloat(value)),
  }));
}); 

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn();
  return res;
};
beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
  });
  
  afterAll(() => {
    console.error.mockRestore(); // Restore original console.error after tests
  });
  
const mockNext = jest.fn();

describe("disburseTransactions", () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { id: "merchant123" },
      body: { amount: 500 },
    };
    res = mockResponse();
    validationResult.mockReturnValue({ isEmpty: jest.fn(() => true) });
  });

  it("should disburse transactions and return success response", async () => {
    const transactionsMock = [
      { transaction_id: 1, balance: new Decimal(300), settled_amount: new Decimal(200), original_amount: new Decimal(300) },
      { transaction_id: 2, balance: new Decimal(300), settled_amount: new Decimal(250), original_amount: new Decimal(300) },
    ];

    const disbursementMock = {
      updates: [
        { transaction_id: 1, disbursed: true, balance: new Decimal(0), settled_amount: new Decimal(200), original_amount: new Decimal(300) },
        { transaction_id: 2, disbursed: true, balance: new Decimal(0), settled_amount: new Decimal(250), original_amount: new Decimal(300) }
      ],
      totalDisbursed: new Decimal(500),
    };

    // Mock the return values of the services
    getMerchantRate.mockResolvedValue(0.02);
    getEligibleTransactions.mockResolvedValue(transactionsMock);
    updateTransactions.mockResolvedValue();
    calculateDisbursement.mockReturnValue(disbursementMock);
    
    await disburseTransactions(req, res, mockNext);

    expect(getMerchantRate).toHaveBeenCalledWith(expect.anything(), "merchant123");
    expect(getEligibleTransactions).toHaveBeenCalledWith("merchant123", expect.anything());
    expect(updateTransactions).toHaveBeenCalledWith(disbursementMock.updates, expect.anything());
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(ApiResponse.success({
      message: "Transactions disbursed successfully",
      totalDisbursed: disbursementMock.totalDisbursed.toString(),
      transactionsUpdated: disbursementMock.updates,
    }));
  });

  it("should return validation errors if request validation fails", async () => {
    validationResult.mockReturnValue({
      isEmpty: jest.fn(() => false),
      array: jest.fn(() => [{ msg: "Invalid data" }]),
    });
  
    await disburseTransactions(req, res, mockNext);
  
    // Update the expected structure to match the actual response
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(ApiResponse.error({
      msg: "Invalid data",  // Note that the message is no longer wrapped in an array
    }));
  });


  it("should return 401 if merchant ID is missing", async () => {
    req.user = null;

    await disburseTransactions(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
  });

  it("should handle errors during transaction disbursement", async () => {
    const error = new CustomError("No eligible transactions to disburse", 400);
    getEligibleTransactions.mockRejectedValue(error);

    await disburseTransactions(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(ApiResponse.error("No eligible transactions to disburse"));
  });

  it("should handle unexpected errors and return 500", async () => {
    const error = new Error("Unexpected error");
    getEligibleTransactions.mockRejectedValue(error);

    await disburseTransactions(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(ApiResponse.error("Internal Server Error"));
  });
});
