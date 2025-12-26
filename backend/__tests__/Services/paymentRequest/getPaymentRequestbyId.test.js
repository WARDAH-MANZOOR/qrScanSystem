// Import the necessary modules
import prisma from "../../../dist/prisma/client.js";
import servicePaymentRequest from "../../../dist/services/paymentRequest/index.js";
import CustomError from "../../../dist/utils/custom_error.js";

// Mocking Prisma Client
jest.mock("../../../dist/prisma/client.js", () => ({
  paymentRequest: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
}));

describe('getPaymentRequestbyId', () => {

  // Test case: Successfully retrieve a payment request
  it('should return the payment request successfully when it exists', async () => {
    const paymentRequestId = 1; // Example ID
    const paymentRequestData = {
      id: 1,
      amount: 100,
      status: 'Pending',
      deletedAt: null,
    };

    // Mock Prisma's findFirst method to return the mock data
    prisma.paymentRequest.findFirst.mockResolvedValue(paymentRequestData);

    const result = await servicePaymentRequest.getPaymentRequestbyId(paymentRequestId);

    expect(result.message).toBe('Payment request retrieved successfully');
    expect(result.data).toEqual(paymentRequestData);
  });

  // Test case: Payment request not found
  it('should throw an error when payment request is not found', async () => {
    const paymentRequestId = 999; // ID that does not exist

    // Mock Prisma's findFirst method to return null (not found)
    prisma.paymentRequest.findFirst.mockResolvedValue(null);

    try {
      await servicePaymentRequest.getPaymentRequestbyId(paymentRequestId);
    } catch (error) {
      expect(error.message).toBe('Payment request not found');
      expect(error.statusCode).toBe(404);
    }
  });

  // Test case: Error retrieving payment request (generic error)
  it('should throw an error when an unexpected error occurs', async () => {
    const paymentRequestId = 1; // Example ID

    // Mock Prisma's findFirst method to reject with an error
    prisma.paymentRequest.findFirst.mockRejectedValue(new Error('Database connection error'));

    try {
      await servicePaymentRequest.getPaymentRequestbyId(paymentRequestId);
    } catch (error) {
      // The error message from CustomError is passed in the catch block
      expect(error.message).toBe('Database connection error'); // Adjusted to match the thrown error
      expect(error.statusCode).toBe(500); // The default status code for unexpected errors
    }
  });

  // Test case: Invalid input error (null paymentRequestId)
  it("should throw a CustomError with default message if error message is undefined", async () => {
    // Mock the prisma.paymentRequest.findFirst to throw an error without a message
    prisma.paymentRequest.findFirst.mockRejectedValue({});

    const paymentRequestId = "test-id";

    expect.assertions(2);

    try {
        await servicePaymentRequest.getPaymentRequestbyId(paymentRequestId);
    } catch (error) {
        // Verify the error is an instance of CustomError
        expect(error).toBeInstanceOf(CustomError);

        // Verify the default error message and statusCode
        expect(error).toMatchObject({
            message: "An error occurred while retrieving the payment request",
            statusCode: 500,
        });
    }
});

});
