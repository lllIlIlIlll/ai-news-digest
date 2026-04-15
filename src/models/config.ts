export interface RSSSource {
  name: string;
  url: string;
}

export interface CLIArgs {
  quiet: boolean;
  cron: boolean;
}

export interface AppConfig {
  apiKey: string;
  baseUrl: string;
}
