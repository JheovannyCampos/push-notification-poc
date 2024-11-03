import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import "./App.css";

function getBrowserId() {
  let browserId = localStorage.getItem("browserId");
  if (!browserId) {
    browserId = uuidv4();
    localStorage.setItem("browserId", browserId);
  }
  return browserId;
}

function urlB64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}

async function registerNotificationServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service Worker não suportado no navegador.");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(
      `/notification-service-worker.js`,
      { scope: "./" }
    );

    const sw =
      registration.installing || registration.waiting || registration.active;

    if (!sw) throw new Error("Erro ao registrar o Service Worker.");

    if (sw.state === "activated") return registration;

    return new Promise((resolve) => {
      sw.addEventListener("statechange", (event) => {
        if ((event.target as ServiceWorker)?.state === "activated") {
          resolve(registration);
        }
      });
    });
  } catch (error) {
    console.error("Erro ao registrar o Service Worker:", error);
    return null;
  }
}

async function registerPushManager() {
  const registration = await registerNotificationServiceWorker();
  if (!registration) {
    alert("Não foi possível registrar o Service Worker.");
    return false;
  }

  try {
    const permissionResult = await Notification.requestPermission();
    if (permissionResult !== "granted") {
      alert(`Permissão negada: ${permissionResult}`);
      return false;
    }

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        applicationServerKey: urlB64ToUint8Array(
          "BE6NLRSQrlTIChjXwL2npjMVsEVYNsD3GRFiH8HkIJBShGQRh5E8mLFNSwv1M4XmbfNw3PbRI0S7mGEH78DU9Ro"
        ),
        userVisibleOnly: true,
      });
    } else {
      console.log("Inscrição já existente.");
    }

    const response = await fetch("http://localhost:3000/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: getBrowserId(),
        pushSubscription: subscription,
      }),
    });

    if (!response.ok) {
      throw new Error("Falha ao enviar a inscrição ao servidor.");
    }

    alert("Inscrição bem-sucedida!");
    return true;
  } catch (error) {
    console.error("Erro ao registrar no Push Manager:", error);
    alert(`Erro ao se inscrever no Push Manager: ${error.message}`);
    return false;
  }
}

function App() {
  const [messageInputValue, setMessageInputValue] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const checkSubscription = async () => {
      const registration = await registerNotificationServiceWorker();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          setIsSubscribed(true);
        }
      }
    };

    checkSubscription();
  }, []);

  async function sendNotification(message: string) {
    try {
      await fetch("http://localhost:3000/notify-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
        }),
      });
      alert("Notificação enviada!");
    } catch (error) {
      alert(`Falha ao enviar notificação: ${error.message}`);
    }
  }

  const handleSubscribe = async () => {
    const success = await registerPushManager();
    if (success) {
      setIsSubscribed(true); // Atualiza o estado se a inscrição for bem-sucedida
    }
  };

  return (
    <div className="card">
      <input
        placeholder="Digite a mensagem da notificação"
        value={messageInputValue}
        onChange={(e) => setMessageInputValue(e.target.value)}
      />
      <button onClick={handleSubscribe} disabled={isSubscribed}>
        {isSubscribed ? "Inscrito" : "Inscrever"}
      </button>
      <button onClick={() => sendNotification(messageInputValue)}>
        Notificar todos
      </button>
    </div>
  );
}

export default App;
