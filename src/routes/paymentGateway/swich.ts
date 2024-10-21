import { swichController } from "controller/index.js";
import { Router } from "express";

export default function (router: Router) {
    router.post("/initiate-sw",swichController.initiateSwichController);
}