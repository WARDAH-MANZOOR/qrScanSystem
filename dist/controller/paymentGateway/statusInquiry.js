import { statusInquiry } from "services/index.js";
import ApiResponse from "utils/ApiResponse.js";
import CustomError from "utils/custom_error.js";
const statusInquiryController = async (req, res, next) => {
    try {
        const { merchantId } = req.params;
        const { transactionId } = req.query;
        if (!merchantId || !transactionId) {
            throw new CustomError("Merchant Id or Transaction Id not found", 500);
        }
        const result = await statusInquiry.statusInquiry(merchantId, transactionId);
        if (result?.responseMode != "MA") {
            throw new CustomError("Transaction Not Found", 500);
        }
        res.status(200).json(ApiResponse.success(result));
    }
    catch (err) {
        next(err);
    }
};
export default {
    statusInquiryController
};
