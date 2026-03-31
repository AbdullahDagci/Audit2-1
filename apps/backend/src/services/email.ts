import nodemailer from 'nodemailer';
import { LOGO_BASE64 } from '../assets/logo-base64';

let transporter: nodemailer.Transporter;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log('SMTP test hesabı:', testAccount.user);
  }

  return transporter;
}

// Kurumsal email şablonu - tüm mailler bunu kullanır
export function buildEmailHtml(title: string, bodyContent: string, footerNote?: string): string {
  return `
<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:16px;overflow:hidden;margin-top:20px;margin-bottom:20px;box-shadow:0 2px 15px rgba(0,0,0,0.06);">
    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(135deg,#1B5E20 0%,#2E7D32 50%,#388E3C 100%);padding:28px 32px;text-align:center;">
        <img src="${LOGO_BASE64}" alt="ERTANSA" style="height:48px;margin-bottom:8px;filter:brightness(1.1);" />
        <div style="color:rgba(255,255,255,0.85);font-size:11px;text-transform:uppercase;letter-spacing:3px;margin-top:4px;">Denetim Yönetim Sistemi</div>
      </td>
    </tr>
    <!-- Content -->
    <tr>
      <td style="padding:32px;">
        <h2 style="color:#1B5E20;font-size:20px;font-weight:700;margin:0 0 20px 0;border-bottom:2px solid #E8F5E9;padding-bottom:12px;">${title}</h2>
        <div style="color:#333;font-size:14px;line-height:1.7;">
          ${bodyContent}
        </div>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="background-color:#f8f9fa;padding:20px 32px;border-top:1px solid #e9ecef;">
        ${footerNote ? `<p style="color:#E65100;font-size:12px;margin:0 0 12px 0;font-weight:600;">${footerNote}</p>` : ''}
        <p style="color:#999;font-size:11px;margin:0;">Bu e-posta ERTANSA Denetim Sistemi tarafından otomatik olarak gönderilmiştir.</p>
        <p style="color:#bbb;font-size:10px;margin:8px 0 0 0;">ERTANSA Gıda San. ve Tic. A.Ş. - Denetim Yönetim Sistemi</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; messageId?: string; previewUrl?: string }> {
  try {
    const transport = await getTransporter();
    const from = process.env.SMTP_FROM || 'ERTANSA Denetim <denetim@ertansa.com.tr>';
    const toAddresses = Array.isArray(params.to) ? params.to.join(', ') : params.to;

    const info = await transport.sendMail({
      from,
      to: toAddresses,
      subject: params.subject,
      html: params.html,
      attachments: params.attachments,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.log('Email önizleme:', previewUrl);
    console.log('Email gönderildi:', info.messageId, '->', toAddresses);
    return { success: true, messageId: info.messageId, previewUrl: previewUrl || undefined };
  } catch (error) {
    console.error('Email gönderme hatası:', error);
    return { success: false };
  }
}

export async function getManagementEmails(): Promise<string[]> {
  try {
    const { prisma } = require('../index');
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'management_emails' } });
    if (setting) {
      const dbEmails: string[] = JSON.parse(setting.value);
      if (dbEmails.length > 0) return dbEmails;
    }
  } catch {}
  const emails = process.env.SMTP_TO_MANAGEMENT || '';
  return emails.split(',').map(e => e.trim()).filter(Boolean);
}
