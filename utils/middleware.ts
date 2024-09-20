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
        console.log(data);
        // Proceed to the next middleware
        return next();
    } catch (error) {
        console.log(error);
        return res.status(401).send("something went wrong");
    }
}

const restrict = (role: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        let user: JwtPayload = req.user as JwtPayload;
        if (user?.role !== role){
            const error = new CustomError("You are forbidden to perform this action", 403);
            return next(error);
        }
        next();
    }
}

const restrictMultiple = (...role: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        let user: JwtPayload = req.user as JwtPayload;
        if (!role.includes(user?.role)){
            const error = new CustomError("You are forbidden to perform this action", 403);
            return next(error);
        }
        next();
    }
}

const errorHandler = (err: CustomError, req: Request, res: Response, next: NextFunction) => {
    // Check if the error is operational (CustomError)
    if (err.isOperational) {
        console.log(err.statusCode)
        return res.status(err.statusCode).json({
            status: err.statusText,
            message: err.message
        });
    }

    // For non-operational or unknown errors, send a generic message
    console.error("An unexpected error occurred:", err); // Log the error for debugging

    return res.status(500).json({
        status: 'error',
        message: 'Something went wrong'
    });
};

export {isLoggedIn, restrict, errorHandler, restrictMultiple};