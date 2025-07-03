import prisma from "../../../../dist/prisma/client.js"; // Import Prisma client
import {getUserPassword} from "../../../../dist/services/authentication/index.js"; // Import the function

// Mock the Prisma client
jest.mock("../../../../dist/prisma/client.js", () => ({
  user: {
    findFirst: jest.fn(), // Mock the findFirst method instead of findUnique
  },
}));

describe('getUserPassword', () => {

  // Test Case 1: Valid merchant ID, user found
  it('should return the password for a valid merchant_id', async () => {
    const merchantId = 1;
    const mockPassword = 'hashedPassword123';
    
    // Mock Prisma call
    prisma.user.findFirst.mockResolvedValue({
      password: mockPassword
    });
    
    const result = await getUserPassword(merchantId);
    expect(result.password).toBe(mockPassword); // Check that the password returned matches the mock value
  });

  // Test Case 2: Invalid merchant ID, user not found
  it('should return null for an invalid merchant_id', async () => {
    const merchantId = 9999; // Invalid ID
    prisma.user.findFirst.mockResolvedValue(null); // Mock the case where no user is found
    
    const result = await getUserPassword(merchantId);
    expect(result).toBeNull(); // Check that the result is null when no user is found
  });

});
