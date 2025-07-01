import jazzcashDisburse from "../../services/paymentGateway/jazzcashDisburse.js";
import ApiResponse from "../../utils/ApiResponse.js";
const addDisburseAccount = async (req, res, next) => {
    try {
        const result = await jazzcashDisburse.addDisburseAccount(req.body);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        next(error);
    }
};
const getDisburseAccount = async (req, res, next) => {
    try {
        const result = await jazzcashDisburse.getDisburseAccount(req.params.accountId);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        next(error);
    }
};
const updateDisburseAccount = async (req, res, next) => {
    try {
        const result = await jazzcashDisburse.updateDisburseAccount(req.params.accountId, req.body);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        next(error);
    }
};
const deleteDisburseAccount = async (req, res, next) => {
    try {
        const result = await jazzcashDisburse.deleteDisburseAccount(req.params.accountId);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        next(error);
    }
};
export default {
    addDisburseAccount,
    getDisburseAccount,
    updateDisburseAccount,
    deleteDisburseAccount,
};
