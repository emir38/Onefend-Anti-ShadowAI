import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly baseUrl: string;
  private readonly mailFrom: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('SERVER_URL') || this.config.get<string>('CORS_ORIGIN') || 'http://localhost';
    this.mailFrom = this.config.get<string>('MAIL_FROM') || 'no-reply@localhost';
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: port || 587,
        secure: port === 465, 
        auth: { user, pass },
      });
      this.logger.log(`SMTP Transporter initialized for ${host}`);
    } else {
      this.logger.warn('SMTP constraints not found in environment. MailService will run in MOCK mode (Console only).');
    }
  }

  async sendPasswordResetEmail(toEmail: string, resetToken: string) {
    if (/[\r\n]/.test(toEmail)) {
      this.logger.error('Email address contains invalid characters');
      return;
    }

    const resetUrl = `${this.baseUrl}/reset-password?token=${resetToken}`;
    
    // El hermoso template HTML con la identidad visual de Onefend
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="background-color: #FAF7FF; margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #FAF7FF; padding: 50px 20px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 500px; background-color: #FFFFFF; border: 1px solid #D4C8FF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <tr>
                <td style="padding: 40px;">
                  <div style="text-align: center; margin-bottom: 32px;">
                    <img src="${this.baseUrl}/onefend_logo.svg" alt="Onefend" width="160" style="max-width: 160px; display: inline-block; border: 0;" />
                  </div>
                  
                  <h1 style="color: #1E1B39; font-size: 22px; font-weight: 600; text-align: center; margin: 0 0 24px 0;">Password Reset Request</h1>
                  
                  <p style="color: #1E1B39; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hello,</p>
                  <p style="color: #1E1B39; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">We received a secure request to reset the password for your administrator account at Onefend. If you initiated this request, please click the button below to configure a new high-security password.</p>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin: 32px 0;">
                    <tr>
                      <td align="center">
                        <a href="${resetUrl}" style="background-color: #6466FF; color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 15px; font-weight: 500; display: inline-block;">Reset Password</a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #A5AEB7; font-size: 14px; line-height: 1.6; margin: 0;">If you did not request this change, you can safely ignore this email. Your cryptographic keys and access remain strongly protected.</p>
                  
                  <div style="border-top: 1px solid rgba(212, 200, 255, 0.5); margin-top: 40px; padding-top: 24px; text-align: center;">
                    <p style="color: #9199A1; font-size: 12px; margin: 0 0 6px 0;">Onefend Security &copy; ${new Date().getFullYear()}. All rights reserved.</p>
                    <p style="color: #9199A1; font-size: 12px; margin: 0;">Strictly Confidential. For authorized personnel only.</p>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: this.mailFrom,
          to: toEmail,
          subject: 'Reset your Onefend Password',
          html: htmlContent,
          headers: {
            'X-SMTPAPI': JSON.stringify({
              filters: {
                clicktrack: { settings: { enable: 0 } },
                opentrack: { settings: { enable: 0 } },
              },
            }),
          },
        });
        this.logger.log(`Real Password reset email dispatched via SMTP to ${toEmail}`);
      } catch (error) {
        this.logger.error(`Failed to send real email to ${toEmail}`, error);
      }
    } else {
      // Fallback a consola si no hay credenciales (Testing Mode)
      this.logger.warn(`[MOCK EMAIL] To: ${toEmail} | Link: ${resetUrl}`);
    }
  }

  async sendInvitationEmail(toEmail: string, enrollmentToken: string): Promise<boolean> {
    if (/[\r\n]/.test(toEmail)) {
      this.logger.error('Email address contains invalid characters');
      return false;
    }

    const setupUrl = `${this.baseUrl}/setup?token=${encodeURIComponent(enrollmentToken)}&email=${encodeURIComponent(toEmail)}`;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="background-color: #FAF7FF; margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #FAF7FF; padding: 50px 20px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 540px; background-color: #FFFFFF; border: 1px solid #D4C8FF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <tr>
                <td style="padding: 40px;">
                  <div style="text-align: center; margin-bottom: 32px;">
                    <img src="${this.baseUrl}/onefend_logo.svg" alt="Onefend" width="160" style="max-width: 160px; display: inline-block; border: 0;" />
                  </div>

                  <h1 style="color: #1E1B39; font-size: 22px; font-weight: 600; text-align: center; margin: 0 0 24px 0;">You've Been Invited to Install Onefend</h1>

                  <p style="color: #1E1B39; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hello,</p>
                  <p style="color: #1E1B39; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">Your organization has enabled Onefend to protect sensitive data when using AI tools. Please follow the steps below to complete the setup.</p>

                  <div style="background-color: #FAF7FF; border: 1px solid #D4C8FF; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                    <p style="color: #6466FF; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0;">Installation Steps</p>
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td style="padding: 6px 0; color: #1E1B39; font-size: 14px; line-height: 1.5;">
                          <strong style="color: #6466FF;">1.</strong> Click the button below to open the setup page
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #1E1B39; font-size: 14px; line-height: 1.5;">
                          <strong style="color: #6466FF;">2.</strong> Install the Onefend browser extension
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #1E1B39; font-size: 14px; line-height: 1.5;">
                          <strong style="color: #6466FF;">3.</strong> Enter your enrollment token in the extension
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #1E1B39; font-size: 14px; line-height: 1.5;">
                          <strong style="color: #6466FF;">4.</strong> You're all set — Onefend works silently in the background
                        </td>
                      </tr>
                    </table>
                  </div>

                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin: 24px 0;">
                    <tr>
                      <td align="center">
                        <a href="${setupUrl}" style="background-color: #6466FF; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 500; display: inline-block;">Get Started</a>
                      </td>
                    </tr>
                  </table>

                  <div style="background-color: #F8F9FA; border: 1px solid #E5E7EB; border-radius: 6px; padding: 14px; margin-bottom: 16px;">
                    <p style="color: #6B7280; font-size: 12px; margin: 0 0 6px 0;">Or enter this token manually in the extension:</p>
                    <p style="color: #1E1B39; font-size: 14px; font-family: 'SF Mono', 'Fira Code', monospace; font-weight: 600; margin: 0; word-break: break-all;">${enrollmentToken}</p>
                  </div>

                  <p style="color: #A5AEB7; font-size: 13px; line-height: 1.6; margin: 0;">This invitation is unique to your email address. Do not share this token with others.</p>

                  <div style="border-top: 1px solid rgba(212, 200, 255, 0.5); margin-top: 32px; padding-top: 20px; text-align: center;">
                    <p style="color: #9199A1; font-size: 12px; margin: 0 0 6px 0;">Onefend Security &copy; ${new Date().getFullYear()}. All rights reserved.</p>
                    <p style="color: #9199A1; font-size: 12px; margin: 0;">Strictly Confidential. For authorized personnel only.</p>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: this.mailFrom,
          to: toEmail,
          subject: 'Install Onefend — Your Organization\'s AI Security',
          html: htmlContent,
          headers: {
            'X-SMTPAPI': JSON.stringify({
              filters: {
                clicktrack: { settings: { enable: 0 } },
                opentrack: { settings: { enable: 0 } },
              },
            }),
          },
        });
        this.logger.log(`Invitation email sent to ${toEmail}`);
        return true;
      } catch (error) {
        this.logger.error(`Failed to send invitation email to ${toEmail}`, error);
        return false;
      }
    } else {
      this.logger.warn(`[MOCK EMAIL] Invitation to: ${toEmail} | Setup: ${setupUrl}`);
      return true; // Mock mode returns success
    }
  }
}
