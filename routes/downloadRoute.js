const fileDownload = require("../controllers/downloadController");

const router = require("express").Router();

router.get("/:dir/:file", fileDownload);

module.exports = router;
