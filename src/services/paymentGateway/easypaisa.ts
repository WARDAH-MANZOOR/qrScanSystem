import axios from "axios";
import CustomError from "utils/custom_error.js";

const initiateEasyPaisa = async (params: any) => {
    console.log(process.env["CREDENTIALS"])
    let data = JSON.stringify({
        "orderId": "abc123",
        "storeId": process.env["STORE_ID"],
        "transactionAmount": "1.23",
        "transactionType": "MA",
        "mobileAccountNo": "03162309607",
        "emailAddress": "testEnmail@gmail.com"
    });

    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://easypay.easypaisa.com.pk/easypay-service/rest/v4/initiate-ma-transaction',
        headers: {
            'Credentials': process.env["CREDENTIALS"],
            'Content-Type': 'application/json'
        },
        data: data
    };

    let response = await axios.request(config)
    if (response?.data.responseCode == "0000") {
        return {message: "Success"};
    }
    else {
        throw new CustomError("Failed",404);
    }
}

export {initiateEasyPaisa};