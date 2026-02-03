/**
 * Providers de notification par canal
 */

import type { Notification } from './types';

/**
 * Interface de base pour les providers
 */
interface NotificationProvider {
  send(notification: Notification): Promise<boolean>;
}

/**
 * Push Notification Provider (Firebase/APNS)
 */
export class PushNotification implements NotificationProvider {
  private firebaseConfig?: {
    projectId: string;
    privateKey: string;
    clientEmail: string;
  };

  constructor(config?: { firebase?: typeof PushNotification.prototype.firebaseConfig }) {
    this.firebaseConfig = config?.firebase;
  }

  async send(notification: Notification): Promise<boolean> {
    // En production, utiliser Firebase Admin SDK
    // Ici simulation pour le développement
    console.log('[PUSH]', {
      to: notification.recipientId,
      title: notification.title,
      body: notification.body,
      data: notification.data
    });
    
    // Simuler envoi réussi
    return true;
  }

  /**
   * Configure Firebase
   */
  setFirebaseConfig(config: typeof this.firebaseConfig): void {
    this.firebaseConfig = config;
  }
}

/**
 * Email Notification Provider
 */
export class EmailNotification implements NotificationProvider {
  private smtpConfig?: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  };

  private resendApiKey?: string;

  constructor(config?: { 
    smtp?: typeof EmailNotification.prototype.smtpConfig;
    resendApiKey?: string;
  }) {
    this.smtpConfig = config?.smtp;
    this.resendApiKey = config?.resendApiKey;
  }

  async send(notification: Notification): Promise<boolean> {
    // En production, utiliser Resend, SendGrid, ou SMTP
    console.log('[EMAIL]', {
      to: notification.recipientId,
      subject: notification.title,
      body: notification.body
    });
    
    return true;
  }

  /**
   * Configure SMTP
   */
  setSMTPConfig(config: typeof this.smtpConfig): void {
    this.smtpConfig = config;
  }

  /**
   * Configure Resend
   */
  setResendApiKey(apiKey: string): void {
    this.resendApiKey = apiKey;
  }
}

/**
 * SMS Notification Provider
 */
export class SMSNotification implements NotificationProvider {
  private twilioConfig?: {
    accountSid: string;
    authToken: string;
    fromNumber: string;
  };

  constructor(config?: { twilio?: typeof SMSNotification.prototype.twilioConfig }) {
    this.twilioConfig = config?.twilio;
  }

  async send(notification: Notification): Promise<boolean> {
    // En production, utiliser Twilio ou autre provider SMS
    console.log('[SMS]', {
      to: notification.recipientId,
      message: `${notification.title}: ${notification.body}`
    });
    
    return true;
  }

  /**
   * Configure Twilio
   */
  setTwilioConfig(config: typeof this.twilioConfig): void {
    this.twilioConfig = config;
  }
}

/**
 * Webhook Notification Provider
 */
export class WebhookNotification implements NotificationProvider {
  private webhookUrl: string;
  private headers: Record<string, string>;

  constructor(webhookUrl: string, headers: Record<string, string> = {}) {
    this.webhookUrl = webhookUrl;
    this.headers = headers;
  }

  async send(notification: Notification): Promise<boolean> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.headers
        },
        body: JSON.stringify({
          event: notification.type,
          recipientId: notification.recipientId,
          recipientType: notification.recipientType,
          title: notification.title,
          body: notification.body,
          data: notification.data,
          timestamp: new Date().toISOString()
        })
      });
      
      return response.ok;
    } catch (error) {
      console.error('[WEBHOOK] Error:', error);
      return false;
    }
  }

  /**
   * Met à jour l'URL du webhook
   */
  setWebhookUrl(url: string): void {
    this.webhookUrl = url;
  }

  /**
   * Ajoute des headers
   */
  addHeaders(headers: Record<string, string>): void {
    this.headers = { ...this.headers, ...headers };
  }
}
