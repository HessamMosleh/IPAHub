import { Injectable, Logger } from '@nestjs/common';

/** Stub SMS sender — logs the message. Replace when a real gateway is wired. */
@Injectable()
export class SmsSender {
  private readonly logger = new Logger(SmsSender.name);

  async send(mobile: string, message: string): Promise<void> {
    this.logger.log(`[SMS stub] to=${mobile} message=${message}`);
  }
}

export function otpMessage(code: string): string {
  return `Your IPA verification code is: ${code}`;
}
