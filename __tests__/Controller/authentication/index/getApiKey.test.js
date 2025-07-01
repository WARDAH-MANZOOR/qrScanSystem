
import authenticationController from "../../../../dist/controller/authentication/index.js";
import { authenticationService } from "../../../../dist/services/index.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import CustomError from "../../../../dist/utils/custom_error.js"; 
// Mock the authentication service
jest.mock("../../../../dist/services/index.js", () => ({
    authenticationService: {
        getAPIKey: jest.fn(),
    },
}));

describe("GetAPIKey", () => {
    let req, res, next;

    beforeEach(() => {
        req = { params: { id: "1" } };  // Default to a valid user ID
        res = {
            status: jest.fn().mockReturnThis(),  // Mock status method
            json: jest.fn(),  // Mock json method
        };
        next = jest.fn();  // Mock next middleware
    });

    it("should return 400 if the user id is invalid", async () => {
        req.params.id = "invalid"; // Invalid user id
    
        await authenticationController.getAPIKey(req, res, next);
    
        // Ensure next was called with the correct error
        expect(next).toHaveBeenCalledWith(new CustomError("Invalid user id", 400));
    });
    it("should return the API key for valid user id", async () => {
        const mockApiKey = { apiKey: "gsuidfg45dsfuixcj6sdnj" };
                
        // Mock the service function
        authenticationService.getAPIKey.mockResolvedValue(mockApiKey);
        
        await authenticationController.getAPIKey(req, res, next);
        
        // Expect ID to be passed as number
        expect(authenticationService.getAPIKey).toHaveBeenCalledWith(1); 
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockApiKey));
    });
    it("should handle errors and pass them to the next middleware", async () => {
        // Mock the service function to reject with an error
        authenticationService.getAPIKey.mockRejectedValue(new Error("Error fetching API key"));

        await authenticationController.getAPIKey(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));  // Expect the error to be passed to the next middleware
    });
});