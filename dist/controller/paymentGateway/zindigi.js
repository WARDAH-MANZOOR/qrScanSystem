import { zindigiService } from "../../services/index.js";
import ApiResponse from "../../utils/ApiResponse.js";
const walletToWalletPaymentController = async (req, res, next) => {
    try {
        // Step 1: Attempt to fetch the existing client secret
        let clientSecret = await zindigiService.fetchExistingClientSecret();
        // Step 2: Attempt to use the client secret with the target API
        let isValid = await zindigiService.walletToWalletPayment(req.body, clientSecret);
        if (!isValid.success) {
            console.log('Existing client secret is invalid. Generating a new one...');
            clientSecret = await zindigiService.generateNewClientSecret();
            // Retry using the new client secret
            isValid = await zindigiService.walletToWalletPayment(req.body, clientSecret);
            if (!isValid) {
                throw new Error('Failed to use the new client secret with the API.');
            }
        }
        res.status(200).json(ApiResponse.success(isValid.data));
    }
    catch (err) {
        next(err);
    }
};
const debitInquiryController = async (req, res, next) => {
    try {
        const response = await zindigiService.debitInquiry(req.body);
        const response2 = await zindigiService.debitPayment(req.body, response);
        res.status(200).json(ApiResponse.success(response2));
    }
    catch (err) {
        next(err);
    }
};
const transactionInquiryController = async (req, res, next) => {
    try {
        const response = await zindigiService.transactionInquiry(req.body);
        res.status(200).json(ApiResponse.success(response));
    }
    catch (err) {
        next(err);
    }
};
const getZindigiMerchant = async (req, res, next) => {
    try {
        const merchantId = req.params.merchantId;
        const merchant = await zindigiService.getMerchant(merchantId);
        res.status(200).json(ApiResponse.success(merchant));
    }
    catch (error) {
        next(error);
    }
};
const createZindigiMerchant = async (req, res, next) => {
    try {
        const newMerchant = await zindigiService.createMerchant(req.body);
        res.status(201).json(ApiResponse.success(newMerchant));
    }
    catch (error) {
        next(error);
    }
};
const updateZindigiMerchant = async (req, res, next) => {
    try {
        const merchantId = req.params.merchantId;
        const updatedMerchant = await zindigiService.updateMerchant(merchantId, req.body);
        if (!updatedMerchant) {
            res.status(404).json(ApiResponse.error("Merchant not found"));
            return;
        }
        res.status(200).json(ApiResponse.success(updatedMerchant));
    }
    catch (error) {
        next(error);
    }
};
const deleteZindigiMerchant = async (req, res, next) => {
    try {
        const merchantId = req.params.merchantId;
        const deletedMerchant = await zindigiService.deleteMerchant(merchantId);
        if (!deletedMerchant) {
            res.status(404).json(ApiResponse.error("Merchant not found"));
            return;
        }
        res
            .status(200)
            .json(ApiResponse.success({ message: "Merchant deleted successfully" }));
    }
    catch (error) {
        next(error);
    }
};
export default { walletToWalletPaymentController, debitInquiryController, transactionInquiryController, getZindigiMerchant, createZindigiMerchant, updateZindigiMerchant, deleteZindigiMerchant };
