import { Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import prisma from "prisma/client.js";
import CustomError from "utils/custom_error.js";

const updateMerchant = async (req: Request,res:Response) => {
    const { username, phone_number, company_name, company_url, city,payment_volume, commission, merchantId  } = req.body;
try{
    await prisma.merchant.update({
        data:{
            full_name:username,phone_number,company_name,company_url,city,payment_volume,commission
        },
        where: {merchant_id: merchantId}
    })
    res.status(200).send({mesage:"Merchant updated"})
}
catch(mustafa) {
    console.log(mustafa)
    const error = new CustomError("Internal Server Error",500);
    res.status(500).send(error)
}}

const getMerchants = async (req: Request, res: Response) => {
    try {
        let merchants = await prisma.merchant.findMany();
        res.status(200).json(merchants);
    }
    catch(err) {
        const error = new CustomError("Internal Server Error",500);
        res.status(500).send(error);
    }
}
export {updateMerchant, getMerchants};