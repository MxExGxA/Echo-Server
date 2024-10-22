import * as path from "path";
import * as process from "process";
import * as fs from "fs";
import { Request, Response } from "express";

const fileDownload = async (req: Request, res: Response) => {
  const filePath = path.join(
    process.cwd(),
    "tmp",
    "upload",
    req.params.dir,
    req.params.file
  );

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);

  fileStream.on("error", (err) => {
    res.status(500).send("File Handling Error");
    res.end();
  });
};

export default fileDownload;
