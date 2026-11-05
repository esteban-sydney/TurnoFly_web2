declare module 'web-push' {
  interface Subscription {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }

  interface SendOptions {
    TTL?: number;
    urgency?: 'very-low' | 'low' | 'normal' | 'high';
  }

  const webPush: {
    setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
    sendNotification(subscription: Subscription, payload: string, options?: SendOptions): Promise<unknown>;
  };

  export default webPush;
}
