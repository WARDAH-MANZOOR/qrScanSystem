import { Request, Response } from "express";
import { ipnService } from "../../services/index.js";
import ApiResponse from "../../utils/ApiResponse.js";

const handleRaastQRIPN = async (req: Request, res: Response): Promise<void> => {
    try {
        const requestBody = req.body;
        console.log(JSON.stringify({ event: "RAAST_QR_IPN_RECEIVED", requestBody }));

        // Process the Raast QR IPN
        const responseData = await ipnService.processRaastQRIPN(requestBody);
        res.json(responseData);
    }
    catch (error: any) {
        console.error("Raast QR IPN Error:", error);
        res.status(500).json(ApiResponse.error(error.message, 500));
    }
};

export default { handleRaastQRIPN };