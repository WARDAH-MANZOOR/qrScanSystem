import { permissionService } from "../../services/index.js";
import ApiResponse from "../../utils/ApiResponse.js";
const getPermissions = async (req, res) => {
    const merchant_id = req.user?.merchant_id;
    if (!merchant_id) {
        res.status(401).json(ApiResponse.error('Unauthorized', 401));
        return;
    }
    const permissions = await permissionService.getPermissions();
    res.status(200).json(ApiResponse.success(permissions));
};
export default {
    getPermissions,
};
