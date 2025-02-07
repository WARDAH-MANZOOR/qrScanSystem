import { ipnService } from "../../services/index.js";
import ApiResponse from "../../utils/ApiResponse.js";
const handleIPN = async (req, res) => {
    try {
        // Extract the relevant fields from the request body
        const requestBody = req.body;
        // Call the service to process
        const responseData = await ipnService.processIPN(requestBody);
        // Return response
        res.json(responseData);
    }
    catch (error) {
        res.status(500).json(ApiResponse.error(error.message, 500));
    }
};
export default { handleIPN };
