import { block_phone_number } from "services/index.js";
import ApiResponse from "utils/ApiResponse.js";
const addBlockedNumber = async (req, res, next) => {
    try {
        const { phone } = req.body;
        const records = await block_phone_number.addBlockedNumber(phone);
        res.status(200).json(ApiResponse.success(records));
    }
    catch (err) {
        next(err);
    }
};
const getBlockedNumbers = async (req, res, next) => {
    try {
        const records = await block_phone_number.getBlockedNumbers(req.query);
        res.status(200).json(ApiResponse.success(records));
    }
    catch (err) {
        next(err);
    }
};
export default { addBlockedNumber, getBlockedNumbers };
