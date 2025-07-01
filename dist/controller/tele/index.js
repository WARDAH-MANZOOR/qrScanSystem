import { teleService } from "services/index.js";
import ApiResponse from "utils/ApiResponse.js";
const getAllWalletAccounts = async (req, res, next) => {
    try {
        const result = await teleService.getAllWalletAccounts();
        res.status(200).json(ApiResponse.success(result));
    }
    catch (err) {
        next(err);
    }
};
const getAllWalletAccountsWithMerchant = async (req, res, next) => {
    try {
        const result = await teleService.getAllWalletAccountWithAMerchant();
        res.status(200).json(ApiResponse.success(result));
    }
    catch (err) {
        next(err);
    }
};
export default {
    getAllWalletAccounts,
    getAllWalletAccountsWithMerchant
};
