import authenticationController from "../../../../dist/controller/authentication/index.js";
import { authenticationService } from "../../../../dist/services/index.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import CustomError from "../../../../dist/utils/custom_error.js"; 


jest.mock("../../../../dist/services/index.js", () => ({
    authenticationService: {
        createAPIKey: jest.fn(),
    },
}));

describe("createAPIKey", () => {
    let req, res, next;

    beforeEach(() => {
        req = { params: { id: 1 } };
        res = { 
            status: jest.fn().mockReturnThis(), 
            json: jest.fn()  // Changed from send to json
        };
        next = jest.fn();
    });


    it("should return 400 if the user id is invalid", async () => {
        req.params.id = "invalid"; // Invalid user id
    
        await authenticationController.createAPIKey(req, res, next);
    
        // Ensure next was called with the correct error
        expect(next).toHaveBeenCalledWith(new CustomError("Invalid user id", 400));
    });

    

    it("should return a new API key for valid user id", async () => {
        const mockApiKey = { apiKey: "gsuidfg45dsfuixcj6sdnj" };
        authenticationService.createAPIKey.mockResolvedValue(mockApiKey);

        await authenticationController.createAPIKey(req, res, next);

        // Check status first
        expect(res.status).toHaveBeenCalledWith(200);
        // Ensure json was called with the success response containing the mock API key
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockApiKey));
    });


    

    it("should handle errors and pass them to the next middleware", async () => {
        authenticationService.createAPIKey.mockRejectedValue(new Error("Error creating API key"));

        await authenticationController.createAPIKey(req, res, next);

        // Ensure the next function is called with an error
        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });


    
});
