import { exportSettlement, getSettlement } from "../../services/settlement/index.js";
import ApiResponse from "../../utils/ApiResponse.js";
const getSettlements = async (req, res, next) => {
    try {
        const queryParameters = req.query;
        const user = req.user;
        const result = await getSettlement(queryParameters, user);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        res.status(400).json(ApiResponse.error(error?.message, error?.statusCode));
    }
};
const exportSettlements = async (req, res, next) => {
    try {
        const queryParameters = req.query;
        const user = req.user;
        const result = await exportSettlement(queryParameters, user);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
        res.send(result);
    }
    catch (error) {
        res.status(400).json(ApiResponse.error(error?.message, error?.statusCode));
    }
};
export { getSettlements, exportSettlements };
