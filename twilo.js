import twilio from "twilio";

const accountSid = "REMOVED_SID";   // tu Account SID de Twilio
const authToken = "REMOVED_AUTH";     // tu Auth Token de Twilio
const client = twilio(accountSid, authToken);

export function enviarWhatsApp(numero, mensaje) {
  return client.messages.create({
    body: mensaje,
    from: "whatsapp:+14155238886", // número sandbox
    to: `whatsapp:${item.telefono}`
  });
}
