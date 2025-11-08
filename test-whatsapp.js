import { enviarWhatsApp } from "./twilo.js";

const numeroPrueba = "+59175342309"; // tu número de celular con código de país
const mensaje = "¡Hola! Este es un mensaje de prueba desde Twilio.";

enviarWhatsApp(numeroPrueba, mensaje)
  .then(res => console.log("Mensaje enviado con SID:", res.sid))
  .catch(err => console.error("Error enviando WhatsApp:", err));
