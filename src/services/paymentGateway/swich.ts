import CustomError from "utils/custom_error.js";
import axios from "axios"
import dotenv from "dotenv";
dotenv.config();
const initiateSwich = async (payload: any) => {
    let data = JSON.stringify({
        "customerTransactionId": "T5",
        "categoryId": "2",
        "channelId": payload.channel.toUpperCase() == "JAZZCASH" ? "10": "8",
        "item": "1",
        "remoteIPAddress": process.env["REMOTE_IP_ADDRESS"],
        "amount": 11,
        "msisdn": process.env["MSISDN"],
        "email": "mustafatola02@gmail.com"
    });

    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://api.swichnow.com/gateway/payin/purchase/ewallet',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjRLQlRMRVRWU0tVNjlFWEs1WDVBXy1NOVJFV1NGUVNNUUpOUTVKVDgiLCJ0eXAiOiJhdCtqd3QifQ.eyJzdWIiOiJkNDRlMjcwMTBhNGI0NTJkODdiZTQ3NTIwYmI1YjE5MCIsIm5hbWUiOiJEZXZlbG9wZXJzIFBvcnQiLCJzY29wZSI6WyJwZXJtOmFwaSIsInBlcm06cGF5aW4iXSwib2lfcHJzdCI6ImQ0NGUyNzAxMGE0YjQ1MmQ4N2JlNDc1MjBiYjViMTkwIiwiY2xpZW50X2lkIjoiZDQ0ZTI3MDEwYTRiNDUyZDg3YmU0NzUyMGJiNWIxOTAiLCJvaV90a25faWQiOiIxOTUyMzQ3MCIsImV4cCI6MTcyOTU0MDg1OCwiaXNzIjoiaHR0cHM6Ly9hdXRoLnN3aWNobm93LmNvbS8iLCJpYXQiOjE3Mjk1MzcyNTh9.QfF5JnI_BPaXiFPNTL7vVdXz7XqdgSOa0pa1_6XqCY2p11d1mgzvDnMU0F3n5laTvnhtP7_4QH0NSybGRCah2DLqISgRHN1ZUuTy5_surU-w4PLiBe8vd8VJ96fIN2Z9b9Z8yuGntQcEcoI0yNmCUjSg0OAWjMUCIUIK9XP93fhQEEdhpX2UckYOij1PQ_LstXmodlnxhuLadP25riGvoYlAgE9bg07CdnLboFmZJNy3bHy_acEcZPkE7QJw641P-tX69nTpSjiI3EiNHFm4ZUGwfH8LxWr1BQtgEpe9fr_5-AWIxuGkNis8nDR7I20jJttid6vaWO8ZIwqFHRM4JA'
        },
        data: data
    };

    let res = await axios.request(config)
    if (res.data.code === "0000") {
        return { message: "Payment Recieved Successfully" }
    }
    else {
        throw new CustomError("Internal Server Error", 500);
    }
}

export default {initiateSwich}