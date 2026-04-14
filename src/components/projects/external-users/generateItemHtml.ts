interface GenerateHtmlParams {
  projectName: string;
  phaseName: string;
  item: any;
  additionalMessage?: string;
  lang?: string;
}

const tr = (lang: string | undefined, en: string, es: string) => lang === "es" ? es : en;

export function generateItemSubject({ projectName, itemTitle, lang }: { projectName: string; itemTitle: string; lang?: string }) {
  return `${tr(lang, "Item info", "Info del ítem")}: ${itemTitle} — ${projectName}`;
}

export function generateItemHtml({ projectName, phaseName, item, additionalMessage, lang }: GenerateHtmlParams): string {
  const status = item.is_completed
    ? tr(lang, "Completed", "Completado")
    : tr(lang, "Pending", "Pendiente");
  const statusColor = item.is_completed ? "#16a34a" : "#ea580c";

  const createdAt = item.created_at ? new Date(item.created_at).toLocaleDateString(lang === "es" ? "es-ES" : "en-US", { year: "numeric", month: "long", day: "numeric" }) : "—";
  const updatedAt = item.updated_at ? new Date(item.updated_at).toLocaleDateString(lang === "es" ? "es-ES" : "en-US", { year: "numeric", month: "long", day: "numeric" }) : "—";

  return `
<!DOCTYPE html>
<html lang="${lang || "es"}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <tr><td>
      <!-- Header -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr>
          <td style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#0066cc;padding-bottom:16px;">
            ${projectName}
          </td>
        </tr>
      </table>

      <!-- Title -->
      <h1 style="font-size:20px;font-weight:600;color:#111827;margin:0 0 12px;line-height:1.3;">
        ${tr(lang, "Item Information", "Información del Ítem")}
      </h1>

      <!-- Details Card -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;padding:20px;margin-bottom:24px;border:1px solid #e5e7eb;">
        <tr><td>
          <p style="font-size:13px;color:#374151;margin:0 0 8px;line-height:1.5;">
            <strong style="color:#111827;">${tr(lang, "Project", "Proyecto")}:</strong> ${escapeHtml(projectName)}
          </p>
          <p style="font-size:13px;color:#374151;margin:0 0 8px;line-height:1.5;">
            <strong style="color:#111827;">${tr(lang, "Phase", "Fase")}:</strong> ${escapeHtml(phaseName)}
          </p>
          <p style="font-size:13px;color:#374151;margin:0 0 8px;line-height:1.5;">
            <strong style="color:#111827;">${tr(lang, "Item", "Ítem")}:</strong> ${escapeHtml(item.title)}
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0;" />
          <p style="font-size:13px;color:#374151;margin:0 0 8px;line-height:1.5;">
            <strong style="color:#111827;">${tr(lang, "Status", "Estado")}:</strong>
            <span style="color:${statusColor};font-weight:600;"> ${status}</span>
          </p>
          <p style="font-size:13px;color:#374151;margin:0 0 8px;line-height:1.5;">
            <strong style="color:#111827;">${tr(lang, "Created", "Creado")}:</strong> ${createdAt}
          </p>
          <p style="font-size:13px;color:#374151;margin:0;line-height:1.5;">
            <strong style="color:#111827;">${tr(lang, "Updated", "Actualizado")}:</strong> ${updatedAt}
          </p>
        </td></tr>
      </table>

      ${item.description ? `
      <!-- Description -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr><td>
          <h2 style="font-size:14px;font-weight:600;color:#111827;margin:0 0 8px;">${tr(lang, "Description", "Descripción")}</h2>
          <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:0;">${escapeHtml(item.description)}</p>
        </td></tr>
      </table>` : ""}

      ${additionalMessage ? `
      <!-- Additional Message -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border-radius:8px;padding:16px 20px;margin-bottom:24px;border:1px solid #bae6fd;">
        <tr><td>
          <p style="font-size:13px;font-weight:600;color:#0369a1;margin:0 0 8px;">${tr(lang, "Additional Message", "Mensaje Adicional")}</p>
          <p style="font-size:13px;color:#374151;line-height:1.5;margin:0;">${escapeHtml(additionalMessage)}</p>
        </td></tr>
      </table>` : ""}

      <!-- Footer -->
      <p style="font-size:11px;color:#9ca3af;margin:0;font-style:italic;">
        ${tr(lang, "This is an informational email sent manually.", "Este es un correo informativo enviado manualmente.")}
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
