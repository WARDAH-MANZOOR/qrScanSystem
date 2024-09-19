import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

const isLoggedIn = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Check if the token exists
        if (!req.cookies.token) {
            return res.status(401).send("You must be logged in");
        }

        // Verify the JWT token
        const data = jwt.verify(req.cookies.token, 'shhhhhhhhhhhhhh') as string | JwtPayload;
        
        // Attach the user data to req.user
        req.user = data;

        // Proceed to the next middleware
        next();
    } catch (error) {
        return res.status(401).send("something went wrong");
    }
}

export {isLoggedIn};