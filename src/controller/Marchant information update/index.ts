import { Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import prisma from "prisma/client.js";

const updateMerchant = async (req: Request,res:Response) => {
    const { username, phone_number, company_name, company_url, city,payment_volume  } = req.body;
try{
    await prisma.merchant.update({
        data:{
            full_name:username,phone_number,company_name,company_url,city,payment_volume
        },
        where: {merchant_id: (req.user as JwtPayload)?.id}
    })
    res.status(200).send({mesage:"Merchant updated"})

}
catch(mustafa) {
    console.log(mustafa)
    res.status(500).send({mesage:"internal server error"})
}}
export default updateMerchant;