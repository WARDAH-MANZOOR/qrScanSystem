import { Router } from "express";
import { login, logout, signup } from "../../controller/authentication/index.js";
import { validateLoginData } from "../../services/authentication/index.js";

const authRoutes = Router();

authRoutes.post("/login", validateLoginData, login);
authRoutes.post("/signup", validateLoginData, signup);
authRoutes.get("/logout", logout);

export default authRoutes;

