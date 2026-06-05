const express = require("express");
const path = require("path");

const app = express();

app.use(express.static(__dirname));

app.listen(8000, () => {
  console.log("GP Photo Studio running on http://localhost:8000");
  require("child_process").exec("start http://localhost:8000");
});