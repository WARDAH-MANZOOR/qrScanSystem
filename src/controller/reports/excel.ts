import { NextFunction, Request, Response } from "express";
import { reportService } from "services/index.js";
import ApiResponse from "utils/ApiResponse.js";
const generateExcelReportController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Call the service method
        const params = req.query;
        const reportPath = await reportService.generateExcelReportService(params);

        // Send the generated Excel file to the client
        res.download(reportPath, "merchant_report.xlsx", (err) => {
            if (err) {
                console.error(err);
                res.status(500).json({ error: "Error downloading the file." });
            }
        });
    } catch (error) {
        console.error(error);
        next(error); // Pass the error to the global error handler
    }
};

const payinPerWalletController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Call the service method
        const params = req.query;
        const result = await reportService.payinPerWalletService(params);

        return res.status(200).json(ApiResponse.success(result));
    } catch (error) {
        console.error(error);
        next(error); // Pass the error to the global error handler
    }
};

export default {generateExcelReportController, payinPerWalletController}