import { ipnService } from "../../services/index.js";
import ApiResponse from "../../utils/ApiResponse.js";
import axios from "axios";
const handleIPN = async (req, res) => {
    try {
        const requestBody = req.body;
        const responseData = await ipnService.processIPN(requestBody);
        res.json(responseData);
    }
    catch (error) {
        res.status(500).json(ApiResponse.error(error.message, 500));
    }
};
const handleCardIPN = async (req, res) => {
    try {
        const requestBody = req.body;
        const responseData = await ipnService.processCardIPN(requestBody);
        res.json(responseData);
    }
    catch (error) {
        res.status(500).json(ApiResponse.error(error.message, 500));
    }
};
const handlebdtIPN = async (req, res) => {
    try {
        const requestBody = req.body;
        const responseData = await ipnService.bdtIPN(requestBody);
        res.json(responseData);
    }
    catch (error) {
        res.status(500).json(ApiResponse.error(error.message, 500));
    }
};
const handleShurjoPayIPN = async (req, res) => {
    try {
        const url = "https://api5.assanpay.com/api/ipn/shurjopay";
        const headers = {};
        if (req.headers['content-type'])
            headers['Content-Type'] = String(req.headers['content-type']);
        const upstream = await axios.post(url, req.body, { headers, timeout: 15000 });
        res.status(upstream.status).send(upstream.data);
    }
    catch (error) {
        if (error.response) {
            res.status(error.response.status || 502).send(error.response.data);
            return;
        }
        res.status(500).json(ApiResponse.error(error.message, 500));
    }
};
export default { handleIPN, handleCardIPN, handlebdtIPN, handleShurjoPayIPN };
