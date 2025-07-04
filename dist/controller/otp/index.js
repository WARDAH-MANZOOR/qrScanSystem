import prisma from "prisma/client.js";
import { BusinessSmsApi } from "utils/business_sms_api.js";
import CustomError from "utils/custom_error.js";
const smsApi = new BusinessSmsApi({ id: 'devtects', pass: 'devtects1122' });
function generateOTP() {
    return Math.floor(10000 + Math.random() * 90000).toString(); // Ensures 5 digits
}
const sendOtp = async (req, res, next) => {
    try {
        const { accountNo, payId } = req.body;
        if (!payId)
            throw new CustomError("Pay ID is required", 500);
        const paymentRequest = await prisma.paymentRequest.findFirst({
            where: {
                id: payId
            }
        });
        if (!paymentRequest)
            throw new CustomError("Payment Request Not Found", 500);
        const otp = generateOTP(); // Generate the OTP
        const msg = `OTP: ${otp}`;
        const result = await smsApi.sendSms({ to: accountNo || paymentRequest?.metadata?.phone, mask: "80223", msg, lang: "English", type: "Xml" });
        await prisma.paymentRequest.update({
            where: {
                id: payId
            },
            data: {
                metadata: {
                    otp: otp,
                    phone: accountNo
                }
            }
        });
        res.json({ success: true, response: result });
    }
    catch (error) {
        // res.status(500).json({ success: false, error: error.message });
        next(error);
    }
};
export default {
    sendOtp
};
