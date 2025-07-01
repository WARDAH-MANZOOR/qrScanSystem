import { cardService } from "services/index.js";
import ApiResponse from "utils/ApiResponse.js";
const getJazzCashCardMerchant = async (req, res, next) => {
    try {
        const { merchantId } = req.params;
        const cardMerchant = await cardService.getJazzCashCardMerchant(merchantId);
        res.status(200).json(ApiResponse.success(cardMerchant));
    }
    catch (err) {
        next(err);
    }
};
const payWithCard = async (req, res, next) => {
    try {
        const { merchantId } = req.params;
        const cardMerchant = await cardService.payWithCard(merchantId, req.body);
        res.status(200).json(ApiResponse.success(cardMerchant));
    }
    catch (err) {
        next(err);
    }
};
export default {
    getJazzCashCardMerchant,
    payWithCard
};
