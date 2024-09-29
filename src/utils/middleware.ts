import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import CustomError from "./custom_error.js";
import prisma from "../prisma/client.js";

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
            statusText: err.statusText,
            status: err.statusCode,
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

const authorize = (permissionName: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const userId = (req.user as JwtPayload)?.id; // Assume user ID is set in req.user

        const userGroups = await prisma.userGroup.findMany({
            where: { userId },
            include: { group: { include: { permissions: true } } },
        });

        const permission =await  prisma.permission.findFirst({
            where: {name: permissionName},
        })

        const hasPermission = userGroups.some(group =>
            group.group.permissions.some(permission2 => permission2.permissionId === permission?.id)
        );

        if (!hasPermission) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        next();
    };
};

const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    return (req.user as JwtPayload)?.role == "Admin" ? next() : res.status(403).json({message: "Forbidden"})
}

export {isLoggedIn, restrict, errorHandler, restrictMultiple, authorize, isAdmin};