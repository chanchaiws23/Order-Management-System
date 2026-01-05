export interface NotificationRecipient {
  id: string;
  email: string;
  name: string;
}

export interface NotificationPayload {
  recipient: NotificationRecipient;
  subject: string;
  body: string;
  templateId?: string;
  templateData?: Record<string, unknown>;
}

export interface NotificationResult {
  success: boolean;
  messageId: string | null;
  errorMessage?: string;
  sentAt: Date;
  channel: string;
}

export interface INotificationService {
  send(payload: NotificationPayload): Promise<NotificationResult>;

  sendBatch(payloads: NotificationPayload[]): Promise<NotificationResult[]>;
}
