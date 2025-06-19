import ApiResponse from "utils/ApiResponse.js";
import { disbursementDispute } from "services/index.js";
const createDisbursementDispute = async (req, res) => {
    try {
        const body = req.body;
        const merchantId = req.user?.merchant_id || req.body.merchant_id;
        const result = await disbursementDispute.createDisbursementDispute(body, merchantId);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (err) {
        res.status(500).json(ApiResponse.error(err.message));
    }
};
const updateDisbursementDisputeStatus = async (req, res) => {
    try {
        const body = req.body;
        const { requestId } = req.params;
        const result = await disbursementDispute.updateDisbursementDispute(Number(requestId), body);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (err) {
        res.status(500).json(ApiResponse.error(err.message));
    }
};
const getDisbursementDisputes = async (req, res) => {
    try {
        const params = req.query;
        const merchantId = req.user?.merchant_id || params.merchantId;
        const result = await disbursementDispute.getDisbursementDisputes(params, merchantId);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (err) {
        res.status(500).json(ApiResponse.error(err.message));
    }
};
const exportDisbursementDisputes = async (req, res, next) => {
    try {
        const { query } = req;
        const id = req.user?.merchant_id || query.merchantId;
        const merchant = await disbursementDispute.exportDisbursementDispute(id, query);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
        res.send(merchant);
    }
    catch (error) {
        next(error);
    }
};
export default {
    createDisbursementDispute,
    updateDisbursementDisputeStatus,
    getDisbursementDisputes,
    exportDisbursementDisputes
};
