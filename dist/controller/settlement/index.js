import { exportSettlement, getSettlement } from "../../services/settlement/index.js";
import ApiResponse from "../../utils/ApiResponse.js";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
const getSettlements = async (req, res, next) => {
    try {
        const queryParameters = req.query;
        const user = req.user;
        const result = await getSettlement(queryParameters, user);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        res.status(400).json(ApiResponse.error(error?.message, error?.statusCode));
    }
};
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXPORT_DIR = path.join(__dirname, "../../../files");
if (!fs.existsSync(EXPORT_DIR))
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
const exportSettlements = async (req, res, next) => {
    try {
        const queryParameters = req.query;
        const user = req.user;
        const result = await exportSettlement(queryParameters, user);
        res.send(result);
    }
    catch (error) {
        res.status(400).json(ApiResponse.error(error?.message, error?.statusCode));
    }
};
export { getSettlements, exportSettlements };
