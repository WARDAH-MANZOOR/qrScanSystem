import { usdtSettlementService } from "services/index.js";
import ApiResponse from "utils/ApiResponse.js";
const getUsdtSettlements = async (req, res) => {
    try {
        const params = req.query;
        const merchantId = req.user?.merchant_id || params.merchantId;
        const result = await usdtSettlementService.getUsdtSettlements(params, merchantId);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (err) {
        res.status(500).json(ApiResponse.error(err.message));
    }
};
const exportUsdtSettlements = async (req, res, next) => {
    try {
        const { query } = req;
        const id = req.user?.merchant_id || query.merchantId;
        const merchant = await usdtSettlementService.exportUsdtSettlements(id, query);
        res.send(merchant);
    }
    catch (error) {
        next(error);
    }
};
export default {
    getUsdtSettlements,
    exportUsdtSettlements
};
