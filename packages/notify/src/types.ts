export type Level = 'INFO' | 'WARN' | 'CRITICAL';

export type ChannelResult =
  | { ok: true; transport: string; details?: string }
  | { ok: false; error: string };

export interface EmailConfig {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  from?: string;
  to?: string[];
}

export interface TelegramConfig {
  botToken?: string;
  chatIds?: string[];
}

export interface SlackConfig {
  botToken?: string;
  channelIds?: string[];
}

export interface SmsConfig {
  twilioSid?: string;
  twilioToken?: string;
  from?: string;
  to?: string[];
}

export interface NotifyConfig {
  email?: EmailConfig;
  telegram?: TelegramConfig;
  slack?: SlackConfig;
  sms?: SmsConfig;
  rateLimit?: {
    keySeconds?: number; // default 60
  };
}

export interface NotifyMessage {
  subject: string;
  text: string;
  level: Level;
  tags?: string[];
}
