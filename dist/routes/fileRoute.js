"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fileController_1 = __importDefault(require("../controllers/fileController"));
const fileRouter = (0, express_1.Router)();
fileRouter.get("/:dir/:file", fileController_1.default);
exports.default = fileRouter;
