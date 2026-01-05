import {
  INotificationService,
  NotificationPayload,
  NotificationResult,
} from '../../application/interfaces/INotificationService';

interface ThirdPartyEmailRequest {
  to_address: string;
  to_name: string;
  subject_line: string;
  html_content: string;
  template_id?: string;
  merge_fields?: Record<string, unknown>;
}

interface ThirdPartyEmailResponse {
  message_id: string;
  status: 'queued' | 'sent' | 'failed';
  error?: string;
  timestamp: string;
}

interface IThirdPartyEmailClient {
  sendEmail(request: ThirdPartyEmailRequest): Promise<ThirdPartyEmailResponse>;
}

class SimulatedEmailClient implements IThirdPartyEmailClient {
  async sendEmail(request: ThirdPartyEmailRequest): Promise<ThirdPartyEmailResponse> {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const shouldFail = Math.random() < 0.05;

    if (shouldFail) {
      return {
        message_id: '',
        status: 'failed',
        error: 'Simulated email delivery failure',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      message_id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'sent',
      timestamp: new Date().toISOString(),
    };
  }
}

export class EmailNotificationAdapter implements INotificationService {
  private readonly emailClient: IThirdPartyEmailClient;

  constructor(emailClient?: IThirdPartyEmailClient) {
    this.emailClient = emailClient ?? new SimulatedEmailClient();
  }

  async send(payload: NotificationPayload): Promise<NotificationResult> {
    const emailRequest = this.adaptToThirdPartyFormat(payload);

    try {
      console.log(
        `[EmailNotificationAdapter] Sending email to: ${payload.recipient.email}`
      );

      const response = await this.emailClient.sendEmail(emailRequest);

      return this.adaptFromThirdPartyResponse(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[EmailNotificationAdapter] Failed to send email: ${errorMessage}`);

      return {
        success: false,
        messageId: null,
        errorMessage,
        sentAt: new Date(),
        channel: 'email',
      };
    }
  }

  async sendBatch(payloads: NotificationPayload[]): Promise<NotificationResult[]> {
    console.log(
      `[EmailNotificationAdapter] Sending batch of ${payloads.length} emails`
    );

    const results = await Promise.allSettled(
      payloads.map((payload) => this.send(payload))
    );

    return results.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        success: false,
        messageId: null,
        errorMessage: result.reason?.message ?? 'Batch send failed',
        sentAt: new Date(),
        channel: 'email',
      };
    });
  }

  private adaptToThirdPartyFormat(payload: NotificationPayload): ThirdPartyEmailRequest {
    return {
      to_address: payload.recipient.email,
      to_name: payload.recipient.name,
      subject_line: payload.subject,
      html_content: payload.body,
      template_id: payload.templateId,
      merge_fields: payload.templateData,
    };
  }

  private adaptFromThirdPartyResponse(
    response: ThirdPartyEmailResponse
  ): NotificationResult {
    return {
      success: response.status === 'sent' || response.status === 'queued',
      messageId: response.message_id || null,
      errorMessage: response.error,
      sentAt: new Date(response.timestamp),
      channel: 'email',
    };
  }
}
