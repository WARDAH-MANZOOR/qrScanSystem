import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import CustomError from "./custom_error.js";

const isLoggedIn = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Check if the token exists
        if (!req.cookies.token) {
            return res.status(401).send("You must be logged in");
        }

        // Verify the JWT token
        const data = jwt.verify(req.cookies.token, 'shhhhhhhhhhhhhh') as JwtPayload;
        
        // Attach the user data to req.user
        req.user = data;

        // Proceed to the next middleware
        next();
    } catch (error) {
        return res.status(401).send("something went wrong");
    }
}

const restrict = (role: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        let user: JwtPayload = req.user as JwtPayload;
        if (user?.role !== role){
            const error = new CustomError("You are forbidden to perform this action", 403);
            next(error);
        }
        next();
    }
}

export {isLoggedIn, restrict};