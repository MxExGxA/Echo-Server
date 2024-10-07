const path = require("path");
const process = require("process");
const fs = require("fs");

const fileDownload = async (req, res) => {
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

module.exports = fileDownload;
