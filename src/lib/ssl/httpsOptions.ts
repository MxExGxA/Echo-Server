import * as fs from "fs";

//read https cert & key files
const https_options = {
  key: fs.readFileSync("ssl_certs/private.key"),
  cert: fs.readFileSync("ssl_certs/certificate.crt"),
  ca: fs.readFileSync("ssl_certs/ca_bundle.crt"),
};

export default https_options;
