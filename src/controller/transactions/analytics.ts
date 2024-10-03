import { Request, Response, NextFunction } from "express";
import { transactionService } from "services/index.js";
import ApiResponse from "utils/ApiResponse.js";

const filterTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const queryParameters = req.query;
        const user = req.user;
        const result = await transactionService.filterTransactions(queryParameters, user);
        return res.status(200).json(ApiResponse.success(result));
      } catch (error) {
        next(error);
      }
}

const getDashboardSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const queryParameters = req.query;
        const result = await transactionService.getDashboardSummary(queryParameters);
        return res.status(200).json(ApiResponse.success(result));
      } catch (error) {
        next(error);
      }
}

export default { filterTransactions, getDashboardSummary };