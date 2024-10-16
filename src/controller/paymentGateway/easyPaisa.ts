import { Request, Response, Router } from "express";
import { initiateEasyPaisa } from "services/paymentGateway/easypaisa.js";
import ApiResponse from "utils/ApiResponse.js";


const easypaisa = async (req: Request, res: Response) => {
    try {
        await initiateEasyPaisa(req.body);
        return res.status(200).json(ApiResponse.success({message: "Payment done successfully"}))
    }
    catch(err) {
        return res.status(500).json(ApiResponse.error("Internal Server Error"))
    }
}

export {easypaisa}