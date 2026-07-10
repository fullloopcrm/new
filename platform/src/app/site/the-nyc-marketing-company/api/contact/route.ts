import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!);
  return _resend;
}

const FROM = "Consortium NYC (Now The NYC Marketing Company) <hi@thenycmarketingcompany.com>";
const TO = "thenycmarketingco@gmail.com";

/**
 * Unified contact API — every form on the site posts here.
 * Sends a notification email via Resend for every lead.
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let type = "unknown";
    let data: Record<string, string> = {};
    let fileNames: string[] = [];
    let attachments: { filename: string; content: Buffer }[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      type = (formData.get("type") as string) || "rfp";
      const dataStr = formData.get("data") as string;
      data = JSON.parse(dataStr);
      const files = formData.getAll("files") as File[];

      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          return NextResponse.json(
            { error: `File ${file.name} exceeds 10MB limit` },
            { status: 400 }
          );
        }
      }

      fileNames = files.map((f) => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)} MB)`);

      // Convert files to attachments for Resend
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        attachments.push({
          filename: file.name,
          content: Buffer.from(arrayBuffer),
        });
      }

      if (!data.name || !data.email) {
        return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
      }
    } else {
      const body = await req.json();
      type = body.type || "unknown";
      data = body;

      switch (type) {
        case "strategy":
          if (!data.name || !data.email || !data.message) {
            return NextResponse.json({ error: "Name, email, and message are required" }, { status: 400 });
          }
          break;
        case "strategy-quick":
          if (!data.name || !data.email) {
            return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
          }
          break;
        case "seo-audit":
          if (!data.email || !data.url) {
            return NextResponse.json({ error: "Email and URL are required" }, { status: 400 });
          }
          break;
        case "exit-intent-audit":
          if (!data.email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
          }
          break;
        default:
          if (!data.email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
          }
      }
    }

    // Build email
    const subject = subjectLine(type, data);
    const html = buildEmailHtml(type, data, fileNames);

    await getResend().emails.send({
      from: FROM,
      to: TO,
      subject,
      html,
      replyTo: data.email,
      ...(attachments.length > 0 && { attachments }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Contact API Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  Email helpers                                                      */
/* ------------------------------------------------------------------ */

function subjectLine(type: string, data: Record<string, string>): string {
  const name = data.name || data.email || "Unknown";
  switch (type) {
    case "strategy":
      return `New Lead: Strategy Session — ${name}`;
    case "strategy-quick":
      return `New Lead: Quick Strategy — ${name}`;
    case "rfp":
      return `New Lead: RFP Submission — ${name}`;
    case "seo-audit":
      return `New Lead: Free SEO Audit — ${name}`;
    case "exit-intent-audit":
      return `New Lead: Exit-Intent Audit — ${data.email}`;
    default:
      return `New Lead — ${name}`;
  }
}

function buildEmailHtml(
  type: string,
  data: Record<string, string>,
  fileNames: string[]
): string {
  const typeLabel: Record<string, string> = {
    strategy: "Strategy Session Request",
    "strategy-quick": "Quick Strategy Session",
    rfp: "RFP Submission",
    "seo-audit": "Free SEO Audit Request",
    "exit-intent-audit": "Exit-Intent Audit Signup",
  };

  const rows = Object.entries(data)
    .filter(([key]) => key !== "type")
    .map(
      ([key, value]) =>
        `<tr>
          <td style="padding:8px 12px;font-weight:600;color:#334155;text-transform:capitalize;vertical-align:top;white-space:nowrap;">${key.replace(/([A-Z])/g, " $1")}</td>
          <td style="padding:8px 12px;color:#475569;">${escapeHtml(String(value || "—"))}</td>
        </tr>`
    )
    .join("");

  const filesRow =
    fileNames.length > 0
      ? `<tr>
          <td style="padding:8px 12px;font-weight:600;color:#334155;vertical-align:top;">Files</td>
          <td style="padding:8px 12px;color:#475569;">${fileNames.map(escapeHtml).join("<br/>")}</td>
        </tr>`
      : "";

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#0f766e;padding:24px 32px;border-radius:12px 12px 0 0;">
        <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">
          ${typeLabel[type] || "New Lead"}
        </h1>
        <p style="margin:4px 0 0;color:#ccfbf1;font-size:14px;">thenycmarketingcompany.com</p>
      </div>
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;padding:24px 32px;border-radius:0 0 12px 12px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.6;">
          ${rows}
          ${filesRow}
        </table>
        ${data.email ? `<p style="margin:20px 0 0;font-size:13px;color:#94a3b8;">Reply directly to this email to respond to <strong>${escapeHtml(data.email)}</strong></p>` : ""}
      </div>
    </div>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}