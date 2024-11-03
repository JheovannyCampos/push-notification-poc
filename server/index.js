const express = require("express");
const webpush = require("web-push");
const cors = require("cors");
const app = express();
const port = 3000;

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://push-notification-poc-chi.vercel.app/*",
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

const vapidKeys = {
  subject: "mailto:jheovannycampos@gmail.com",
  publicKey:
    "BE6NLRSQrlTIChjXwL2npjMVsEVYNsD3GRFiH8HkIJBShGQRh5E8mLFNSwv1M4XmbfNw3PbRI0S7mGEH78DU9Ro",
  privateKey: "-tVLUoaxPaHvWZ-Aoh7-9WLDw2vYLnPf-o3hQIm2o0A",
};

webpush.setVapidDetails(
  vapidKeys.subject,
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

const BrowsersSubscripteds = new Map();

app.use(express.json());

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

app.get("/", (req, res) => {
  res.status(200).json("Hello World");
});

app.post("/subscribe", (req, res) => {
  const { id, pushSubscription } = req.body;

  if (id && pushSubscription) {
    BrowsersSubscripteds.set(id, pushSubscription);
    res.status(200).json({ ok: true });
  } else {
    res.status(400).json({ error: "Id ou pushSubscription ausente" });
  }
});

app.post("/notify-all", (req, res) => {
  const { message } = req.body;
  const notificationPayload = JSON.stringify({
    title: "Hello World!",
    body: message,
  });

  BrowsersSubscripteds.forEach((subscription, id) => {
    console.info("Enviando notificação...", id);

    webpush
      .sendNotification(subscription, notificationPayload)
      .then(() => console.log(`Notificação enviada para ${id} com sucesso.`))
      .catch((error) =>
        console.error(`Erro ao enviar notificação para ${id}: ${error}`)
      );
  });

  res.status(200).json({ ok: true });
});
