import nodemailer from "nodemailer";

function configuracionCorreo() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_APP_PASSWORD;
  const to = process.env.ALERT_EMAIL_TO;
  if (!user || !pass || !to) return null;
  return { user, pass, to };
}

/** Envía alertas operativas sin afectar el flujo principal si SMTP no responde. */
export async function enviarAlertaCorreo(asunto: string, lineas: string[]): Promise<boolean> {
  const config = configuracionCorreo();
  if (!config) {
    console.warn("[alertas-email] Configuración SMTP incompleta; alerta registrada solo en logs.");
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: config.user, pass: config.pass },
    });
    await transporter.sendMail({
      from: "\"REVISOR ARQ · Alertas\" <" + config.user + ">",
      to: config.to,
      subject: asunto,
      text: lineas.join("\n"),
    });
    return true;
  } catch (error) {
    console.error("[alertas-email] No fue posible enviar correo:", error instanceof Error ? error.message : error);
    return false;
  }
}
