const express = require("express");
const webpush = require("web-push");
const cors = require("cors");
const app = express();

// Definindo a porta corretamente
const port = process.env.PORT || 3000;

// Configuração mais robusta do CORS
const corsOptions = {
  origin: ["*"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 200,
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuração do VAPID
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

// Armazenamento das inscrições
const BrowsersSubscripteds = new Map();

// Middleware de erro
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Algo deu errado!" });
});

// Middleware para logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Rota de teste/health check
app.get("/", (req, res) => {
  res.status(200).json({ message: "Servidor rodando!" });
});

// Rota para subscrição
app.post("/subscribe", (req, res) => {
  try {
    const { id, pushSubscription } = req.body;

    if (!id || !pushSubscription) {
      return res.status(400).json({
        error: "Id ou pushSubscription ausente",
        received: { id, pushSubscription },
      });
    }

    BrowsersSubscripteds.set(id, pushSubscription);
    console.log(`Nova inscrição registrada para ID: ${id}`);

    res.status(200).json({
      ok: true,
      message: "Inscrição registrada com sucesso",
    });
  } catch (error) {
    console.error("Erro na rota /subscribe:", error);
    res.status(500).json({
      error: "Erro ao processar inscrição",
      details: error.message,
    });
  }
});

// Rota para notificar todos
app.post("/notify-all", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Mensagem não fornecida" });
    }

    const notificationPayload = JSON.stringify({
      title: "Notificação",
      body: message,
    });

    const notifications = [];

    BrowsersSubscripteds.forEach((subscription, id) => {
      console.log(`Tentando enviar notificação para ${id}`);

      const pushPromise = webpush
        .sendNotification(subscription, notificationPayload)
        .then(() => ({
          id,
          status: "success",
          message: `Notificação enviada com sucesso para ${id}`,
        }))
        .catch((error) => ({
          id,
          status: "error",
          message: `Erro ao enviar para ${id}: ${error.message}`,
        }));

      notifications.push(pushPromise);
    });

    const results = await Promise.all(notifications);

    res.status(200).json({
      ok: true,
      results,
      totalSent: results.filter((r) => r.status === "success").length,
    });
  } catch (error) {
    console.error("Erro na rota /notify-all:", error);
    res.status(500).json({
      error: "Erro ao enviar notificações",
      details: error.message,
    });
  }
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
  console.log(`Endpoints disponíveis:`);
  console.log(`- GET  /`);
  console.log(`- POST /subscribe`);
  console.log(`- POST /notify-all`);
});
