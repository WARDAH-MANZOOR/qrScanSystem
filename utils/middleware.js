import jwt from "jsonwebtoken";
import CustomError from "./custom_error.js";
import prisma from "../prisma/client.js";
const isLoggedIn = async (req, res, next) => {
    try {
        // Check if the token exists
        if (!req.cookies.token) {
            return res.status(401).send("You must be logged in");
        }
        // Verify the JWT token
        const data = jwt.verify(req.cookies.token, 'shhhhhhhhhhhhhh');
        // Attach the user data to req.user
        req.user = data;
        console.log(data);
        // Proceed to the next middleware
        return next();
    }
    catch (error) {
        console.log(error);
        return res.status(401).send("something went wrong");
    }
};
const restrict = (role) => {
    return (req, res, next) => {
        let user = req.user;
        if (user?.role !== role) {
            const error = new CustomError("You are forbidden to perform this action", 403);
            return next(error);
        }
        next();
    };
};
const restrictMultiple = (...role) => {
    return (req, res, next) => {
        let user = req.user;
        if (!role.includes(user?.role)) {
            const error = new CustomError("You are forbidden to perform this action", 403);
            return next(error);
        }
        next();
    };
};
const errorHandler = (err, req, res, next) => {
    // Check if the error is operational (CustomError)
    if (err.isOperational) {
        console.log(err.statusCode);
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
const authorize = (permissionName) => {
    return async (req, res, next) => {
        const userId = req.user?.id; // Assume user ID is set in req.user
        const userGroups = await prisma.userGroup.findMany({
            where: { userId },
            include: { group: { include: { permissions: true } } },
        });
        const permission = await prisma.permission.findFirst({
            where: { name: permissionName },
        });
        const hasPermission = userGroups.some(group => group.group.permissions.some(permission2 => permission2.permissionId === permission?.id));
        if (!hasPermission) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        next();
    };
};
export { isLoggedIn, restrict, errorHandler, restrictMultiple, authorize };
