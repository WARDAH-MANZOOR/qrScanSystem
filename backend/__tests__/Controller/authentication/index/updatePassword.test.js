
// Import required modules and mocks
import authenticationController from "../../../../dist/controller/authentication/index.js";
import { getUserPassword, comparePasswords, hashPassword, updateUserPassword } from "../../../../dist/services/authentication/index.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";

jest.mock("../../../../dist/services/authentication/index.js", () => ({
    getUserPassword: jest.fn(),
    comparePasswords: jest.fn(),
    hashPassword: jest.fn(),
    updateUserPassword: jest.fn(),
}));

jest.mock("../../../../dist/utils/custom_error.js", () => {
    return jest.fn().mockImplementation((message, statusCode) => {
        return { message, statusCode, toString: () => message };
    });
});


// Define mock response and next objects
const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
};
const mockNext = jest.fn();

describe("updatePassword", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should update the password successfully", async () => {
        // Arrange
        const mockReq = {
            user: { merchant_id: "user123" },
            body: { old_password: "oldPass123", new_password: "newPass456" },
        };
        getUserPassword.mockResolvedValue({ password: "hashedOldPass" });
        comparePasswords.mockResolvedValue(true);
        hashPassword.mockResolvedValue("hashedNewPass");

        // Act
        await authenticationController.updatePassword(mockReq, mockRes, mockNext);

        // Assert
        expect(getUserPassword).toHaveBeenCalledWith("user123");
        expect(comparePasswords).toHaveBeenCalledWith("oldPass123", "hashedOldPass");
        expect(hashPassword).toHaveBeenCalledWith("newPass456");
        expect(updateUserPassword).toHaveBeenCalledWith("user123", "hashedNewPass");
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
            ApiResponse.success({ message: "Password updated successfully" })
        );
    });

    it("should return an error if old password does not match", async () => {
        // Arrange
        const mockReq = {
            user: { merchant_id: "user123" },
            body: { old_password: "oldPass123", new_password: "newPass456" },
        };
        getUserPassword.mockResolvedValue({ password: "hashedOldPass" });
        comparePasswords.mockResolvedValue(false);

        // Act
        await authenticationController.updatePassword(mockReq, mockRes, mockNext);

        // Assert
        expect(getUserPassword).toHaveBeenCalledWith("user123");
        expect(comparePasswords).toHaveBeenCalledWith("oldPass123", "hashedOldPass");
        expect(mockNext).toHaveBeenCalledWith({
            message: "Old password do not match",
            statusCode: 500,
            toString: expect.any(Function),
        });
    });

    it("should handle errors thrown by service functions", async () => {
        // Arrange
        const mockReq = {
            user: { merchant_id: "user123" },
            body: { old_password: "oldPass123", new_password: "newPass456" },
        };
        getUserPassword.mockRejectedValue(new Error("Database error"));

        // Act
        await authenticationController.updatePassword(mockReq, mockRes, mockNext);

        // Assert
        expect(getUserPassword).toHaveBeenCalledWith("user123");
        expect(mockNext).toHaveBeenCalledWith(new Error("Database error"));
    });

    
    
    
});
