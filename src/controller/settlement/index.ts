import { NextFunction, Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import { getSettlement } from "services/settlement/index.js";
import ApiResponse from "utils/ApiResponse.js";

const getSettlements = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const queryParameters = req.query;
        const user = req.user as JwtPayload;
        const result = await getSettlement(
            queryParameters,
            user
        );
        return res.status(200).json(ApiResponse.success(result));
    } catch (error: any) {
        return res.status(400).json(ApiResponse.error(error?.message, error?.statusCode));
    }
}

export {getSettlements};