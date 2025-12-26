import prisma from "../../../../dist/prisma/client.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import transactionsCreateService from "../../../../dist/services/transactions/create.js"; // Adjust the import path based on your project structure

jest.mock("../../../../dist/prisma/client.js", () => ({
    user: {
        findUnique: jest.fn(),
        create: jest.fn(),
    },
    userGroup: {
        create: jest.fn(),
    },
}));

describe("findOrCreateCustomer", () => {
    it("should return the existing customer if they are found and valid", async () => {
        const customerName = "John Doe";
        const customerEmail = "john.doe@example.com";
        const merchantId = 1;

        const mockCustomer = {
            id: 1,
            email: customerEmail,
            username: customerName,
            groups: [
                { groupId: 2, group: { id: 2 } }, // Valid customer group
            ],
        };

        prisma.user.findUnique.mockResolvedValue(mockCustomer);

        const result = await transactionsCreateService.findOrCreateCustomer(customerName, customerEmail, merchantId, prisma);

        expect(prisma.user.findUnique).toHaveBeenCalledWith({
            where: { email: customerEmail },
            include: { groups: { include: { group: { select: { id: true } } } } },
        });
        expect(result).toEqual(mockCustomer);
    });

    it("should create a new customer if no customer is found", async () => {
        const customerName = "John Doe";
        const customerEmail = "john.doe@example.com";
        const merchantId = 1;

        const mockNewCustomer = {
            id: 2,
            email: customerEmail,
            username: customerName,
        };

        prisma.user.findUnique.mockResolvedValue(null);  // Simulate no customer found
        prisma.user.create.mockResolvedValue(mockNewCustomer);
        prisma.userGroup.create.mockResolvedValue({});  // Mock successful user group creation

        const result = await transactionsCreateService.findOrCreateCustomer(customerName, customerEmail, merchantId, prisma);

        expect(prisma.user.findUnique).toHaveBeenCalledWith({
            where: { email: customerEmail },
            include: { groups: { include: { group: { select: { id: true } } } } },
        });
        expect(prisma.user.create).toHaveBeenCalledWith({
            data: {
                username: customerName,
                email: customerEmail,
                password: "",  // Password is an empty string as per the implementation
            },
        });
        expect(prisma.userGroup.create).toHaveBeenCalledWith({
            data: {
                userId: mockNewCustomer.id,
                groupId: 3,
                merchantId,
            },
        });
        expect(result).toEqual(mockNewCustomer);
    });

    it("should throw a CustomError if the existing customer is not in a valid group", async () => {
        const customerName = "John Doe";
        const customerEmail = "john.doe@example.com";
        const merchantId = 1;

        const mockCustomer = {
            id: 1,
            email: customerEmail,
            username: customerName,
            groups: [
                { groupId: 1, group: { id: 1 } }, // Invalid group (not a valid customer group)
            ],
        };

        prisma.user.findUnique.mockResolvedValue(mockCustomer);

        try {
            await transactionsCreateService.findOrCreateCustomer(customerName, customerEmail, merchantId, prisma);
        } catch (error) {
            expect(error).toBeInstanceOf(CustomError);
            expect(error.message).toBe("Given user is not a customer");
            expect(error.statusCode).toBe(400);
        }
    });
});
