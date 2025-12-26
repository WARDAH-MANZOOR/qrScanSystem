import disbursementRequestService from '../../../dist/services/disbursementRequest/index.js'; // Update this path to where your function is located
import prisma from "../../../dist/prisma/client.js";
import { backofficeService } from "../../../dist/services/index.js";
import { getWalletBalance } from "../../../dist/services/paymentGateway/disbursement.js";
import CustomError from "../../../dist/utils/custom_error.js";
import { parse, parseISO } from "date-fns";

// Mock the external dependencies
jest.mock("../../../dist/prisma/client.js", () => ({
    disbursementRequest: {
        findMany: jest.fn(),  // Mock findMany directly here
        count: jest.fn()
    }
}));

describe('exportDisbursementRequest', () => {
  
    beforeEach(() => {
        jest.clearAllMocks(); // Reset mock state before each test
        jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
        jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
    });
    
      afterEach(() => {
        console.error.mockRestore(); // Restore console.error after tests
      });
 

  it('should return CSV data for valid parameters', async () => {
    const mockData = [
      {
        merchant: { full_name: 'Merchant A' },
        status: 'approved',
        requestedAmount: 1000,
        createdAt: '2025-01-01T00:00:00Z',
      },
      {
        merchant: { full_name: 'Merchant B' },
        status: 'pending',
        requestedAmount: 500,
        createdAt: '2025-02-01T00:00:00Z',
      }
    ];

    prisma.disbursementRequest.findMany.mockResolvedValue(mockData);  // Use prisma.disbursementRequest.findMany

    const params = {
      start: '2025-01-01 00:00',
      end: '2025-02-01 00:00',
      status: 'approved',
    };

    const result = await disbursementRequestService.exportDisbursementRequest('123', params);

    expect(result).toBeDefined();
    expect(result).toContain('Merchant A');
    expect(result).toContain('approved');
    expect(result).toContain('1000');
    expect(result).toContain('2025-01-01T00:00:00Z');
  });

  it('should throw error when prisma fails to fetch disbursements', async () => {
    prisma.disbursementRequest.findMany.mockRejectedValue(new Error('Database error'));  // Use prisma.disbursementRequest.findMany

    const params = {
      start: '2025-01-01 00:00',
      end: '2025-02-01 00:00',
    };

    await expect(disbursementRequestService.exportDisbursementRequest('123', params))
      .rejects
      .toThrowError('Unable to get disbursement history');
  });

  it('should handle case with no parameters and return all disbursements', async () => {
    const mockData = [
      {
        merchant: { full_name: 'Merchant A' },
        status: 'approved',
        requestedAmount: 1000,
        createdAt: '2025-01-01T00:00:00Z',
      }
    ];

    prisma.disbursementRequest.findMany.mockResolvedValue(mockData);  // Use prisma.disbursementRequest.findMany
    
    const result = await disbursementRequestService.exportDisbursementRequest('123', {});

    expect(result).toBeDefined();
    expect(result).toContain('Merchant A');
    expect(result).toContain('approved');
    expect(result).toContain('1000');
  });

  it('should correctly parse dates in the start and end fields', async () => {
    const mockData = [
      {
        merchant: { full_name: 'Merchant A' },
        status: 'approved',
        requestedAmount: 1000,
        createdAt: '2025-01-01T00:00:00Z',
      }
    ];

    prisma.disbursementRequest.findMany.mockResolvedValue(mockData);  // Use prisma.disbursementRequest.findMany

    const params = {
      start: '2025-01-01 00:00',
      end: '2025-02-01 00:00',
    };

    const result = await disbursementRequestService.exportDisbursementRequest('123', params);
    
    expect(result).toBeDefined();
    expect(result).toContain('Merchant A');
    expect(result).toContain('2025-01-01T00:00:00Z');
  });


});
