import prisma from "prisma/client.js"
import CustomError from "utils/custom_error.js"

const addBlockedNumber = async (phone: string[]) => {
    try {
        const existence = await prisma.blockedPhoneNumbers.findMany({
            where: {
                phoneNumber: {in: phone}
            }
        })
        if(existence.length > 0) {
            throw new CustomError("Some Phone Numbers are Already Blocked", 500)
        }
        const record = await prisma.blockedPhoneNumbers.createMany({
            data: phone.map(number => ({
                phoneNumber: number
            }))
        })
        return record;
    }
    catch(err: any) {
        return {
            message: err?.message || "An Error Occured",
            statusCode: err?.message || 500
        }
    }
}

export default {addBlockedNumber}