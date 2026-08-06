export interface EmailAccount {
  email: string;
  name: string | null;
  dailyCap: number;
  sentToday: number;
}
