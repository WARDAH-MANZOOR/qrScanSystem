import { validationResult } from "express-validator";
import { merchantService } from "../../services/index.js";
import ApiResponse from "../../utils/ApiResponse.js";
import CustomError from "../../utils/custom_error.js";
const updateMerchant = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(404).json(ApiResponse.error(errors.array()[0]));
            return;
        }
        const payload = req.body;
        const result = await merchantService.updateMerchant(payload);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        res.status(error.statusCode).send(ApiResponse.error(error.message));
    }
};
const getMerchants = async (req, res, next) => {
    try {
        const queryParameters = req.query;
        const result = await merchantService.getMerchants(queryParameters);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        next(error);
    }
};
const addMerchant = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(404).json(ApiResponse.error(errors.array()[0]));
            return;
        }
        const payload = req.body;
        const result = await merchantService.addMerchant(payload);
        if (result == "Settlment Duration Required") {
            throw new CustomError(result, 400);
        }
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        res.status(error.statusCode).send(ApiResponse.error(error.message));
    }
};
export default { updateMerchant, getMerchants, addMerchant };
