import { RedisClientType, createClient } from "redis";
import { MessageFromOrderbook } from "./types";
import { MessageToEngine } from "./types/to";
import { redisUrl } from "./config";

export class RedisManager {
  private publisher: RedisClientType;
  private subscriber: RedisClientType;
  private static instance: RedisManager;

  private constructor() {
    if (!redisUrl) {
      throw new Error("REDIS_API_ENGINE_URL must be provided in environment variables.");
    }

    this.publisher = createClient({ url: redisUrl });
    this.subscriber = createClient({ url: redisUrl });

    this.publisher.connect();
    this.subscriber.connect();
    console.log("Connected to Redis (queue + pubsub)");
  }

  public static getInstance() {
    if (!this.instance) {
      this.instance = new RedisManager();
    }
    return this.instance;
  }

  public sendAndAwait(message: MessageToEngine) {
    return new Promise<MessageFromOrderbook>((resolve) => {
      const id = this.getRandomClientId();

      console.log("message:", message, "to be sent to Engine on id", id);

      this.subscriber.subscribe(id, (raw: string) => {
        this.subscriber.unsubscribe(id);
        resolve(JSON.parse(raw));
      });

      this.publisher.lPush(
        "messages",
        JSON.stringify({ clientId: id, message })
      );
    });
  }

  public getRandomClientId() {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }
}
