import { Router } from "express";
import fileDownload from "../controllers/fileController";

const fileRouter = Router();

fileRouter.get("/:dir/:file", fileDownload);

export default fileRouter;
