import { Request, Response } from "express";
import { ipnService } from "services/index.js";
import { PaymentRequestBody } from "services/ipn/index.js";
import ApiResponse from "utils/ApiResponse.js";

const handleIPN = async (req: Request, res: Response): Promise<void> => {
    try {
        // Extract the relevant fields from the request body
        const requestBody: PaymentRequestBody = req.body;

        // Call the service to process
        const responseData = await ipnService.processIPN(requestBody);

        // Return response
        res.json(responseData);
    }
    catch (error: any) {
        res.status(500).json(ApiResponse.error(error.message,500));
    }
};

const handleCardIPN = async (req: Request, res: Response): Promise<void> => {
    try {
        // Extract the relevant fields from the request body
        const requestBody = req.body;

        // Call the service to process
        const responseData = await ipnService.processCardIPN(requestBody);

        // Return response
        res.json(responseData);
    }
    catch (error: any) {
        res.status(500).json(ApiResponse.error(error.message,500));
    }
};

const handlebdtIPN = async (req: Request, res: Response): Promise<void> => {
    try {
        // Extract the relevant fields from the request body
        const requestBody = req.body;

        // Call the service to process
        const responseData = await ipnService.bdtIPN(requestBody);

        // Return response
        res.json(responseData);
    }
    catch (error: any) {
        res.status(500).json(ApiResponse.error(error.message,500));
    }
};

export default { handleIPN, handleCardIPN, handlebdtIPN };