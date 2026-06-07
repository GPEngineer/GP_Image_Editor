const express = require("express");
const path = require("path");
const { exec } = require("child_process");
const net = require("net");
const app = express();

function findFreePort(startPort = 8000) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on("error", () => {
      resolve(findFreePort(startPort + 1));
    });
  });
}

(async () => {
  const PORT = await findFreePort(8000);
  const rootDir = process.cwd();
  console.log("Folder aplikacji:");
  console.log(rootDir);
  app.use(express.static(rootDir));
  app.get("/", (req, res) => {
    res.sendFile(path.join(rootDir, "index.html"));
  });

  app.listen(PORT, () => {
    console.log(`Serwer uruchomiony: http://127.0.0.1:${PORT}`);
    exec(`start http://127.0.0.1:${PORT}`);
  });
})();
