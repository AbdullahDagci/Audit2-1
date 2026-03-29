import nodemailer from 'nodemailer';

const isProduction = process.env.NODE_ENV === 'production';

let transporter: nodemailer.Transporter;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  if (isProduction && process.env.SMTP_HOST) {
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
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('SMTP test hesabı oluşturuldu:', testAccount.user);
  }

  return transporter;
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
    if (previewUrl) {
      console.log('Email onizleme URL:', previewUrl);
    }

    console.log('Email gonderildi:', info.messageId);
    return { success: true, messageId: info.messageId, previewUrl: previewUrl || undefined };
  } catch (error) {
    console.error('Email gonderme hatasi:', error);
    return { success: false };
  }
}

export function getManagementEmails(): string[] {
  const emails = process.env.SMTP_TO_MANAGEMENT || '';
  return emails.split(',').map(e => e.trim()).filter(Boolean);
}
