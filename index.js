const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const webhook = require("./api/webhook");

app.use(bodyParser.json());

app.post("/api/webhook", webhook);

app.get("/health", (req, res) => {
  res.send("OK");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});

