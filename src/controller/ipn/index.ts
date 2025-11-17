import { Request, Response } from "express";
import { ipnService } from "../../services/index.js";
import { PaymentRequestBody } from "../../services/ipn/index.js";
import ApiResponse from "../../utils/ApiResponse.js";
import axios from "axios";

const handleIPN = async (req: Request, res: Response): Promise<void> => {
    try {
        const requestBody: PaymentRequestBody = req.body;
        const responseData = await ipnService.processIPN(requestBody);
        res.json(responseData);
    }
    catch (error: any) {
        res.status(500).json(ApiResponse.error(error.message,500));
    }
};

const handleCardIPN = async (req: Request, res: Response): Promise<void> => {
    try {
        const requestBody = req.body;
        const responseData = await ipnService.processCardIPN(requestBody);
        res.json(responseData);
    }
    catch (error: any) {
        res.status(500).json(ApiResponse.error(error.message,500));
    }
};

const handlebdtIPN = async (req: Request, res: Response): Promise<void> => {
    try {
        const requestBody = req.body;
        const responseData = await ipnService.bdtIPN(requestBody);
        res.json(responseData);
    }
    catch (error: any) {
        res.status(500).json(ApiResponse.error(error.message,500));
    }
};

const handleShurjoPayIPN = async (req: Request, res: Response): Promise<void> => {
    try {
        const url = "https://api5.assanpay.com/api/ipn/shurjopay";
        const headers: Record<string, string> = {};
        if (req.headers['content-type']) headers['Content-Type'] = String(req.headers['content-type']);
        const upstream = await axios.post(url, req.body, { headers, timeout: 15000 });
        res.status(upstream.status).send(upstream.data);
    } catch (error: any) {
        if (error.response) {
            res.status(error.response.status || 502).send(error.response.data);
            return;
        }
        res.status(500).json(ApiResponse.error(error.message, 500));
    }
};

export default { handleIPN, handleCardIPN, handlebdtIPN, handleShurjoPayIPN };