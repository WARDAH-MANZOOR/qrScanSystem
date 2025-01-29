import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { JwtPayload } from "jsonwebtoken";
import ApiResponse from "utils/ApiResponse.js";
import disbursementRequestService from "services/disbursementRequest/index.js";

const createDisbursementRequest = async (req: Request, res: Response) => {
    try {
        const { requested_amount } = req.body;
        const merchantId = (req.user as JwtPayload)?.merchant_id;
        const validationErrors = validationResult(req);
        if (!validationErrors.isEmpty()) {
            res.status(400).json(ApiResponse.error(validationErrors.array()[0] as unknown as string));
            return;
        }
        const result = await disbursementRequestService.createDisbursementRequest(requested_amount, merchantId);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (err: any) {
        res.status(500).json(ApiResponse.error(err.message));
    }
}

const updateDisbursementRequestStatus = async (req: Request, res: Response) => {
    try {
    const { status } = req.body;
    const { requestId } = req.params;
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
        res.status(400).json(ApiResponse.error(validationErrors.array()[0] as unknown as string));
        return;
    }
    const result = await disbursementRequestService.updateDisbursementRequestStatus(Number(requestId), status);
    res.status(200).json(ApiResponse.success(result));
}
catch(err: any) {
    res.status(500).json(ApiResponse.error(err.message));
}
}

export default {
    createDisbursementRequest,
    updateDisbursementRequestStatus
}