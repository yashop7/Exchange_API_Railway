import { RedisClientType, createClient } from "redis";
import { MessageFromOrderbook } from "./types";
import { MessageToEngine } from "./types/to";
import { redisUrl } from "./config";

// If the engine stalls, an unbounded queue of waiting requests is what takes the
// process down — so every call gets a deadline and there is a ceiling on how many
// can be in flight at once.
const ENGINE_TIMEOUT_MS = Number(process.env.ENGINE_TIMEOUT_MS) || 5000;
const MAX_IN_FLIGHT = Number(process.env.ENGINE_MAX_IN_FLIGHT) || 500;

export class EngineTimeoutError extends Error {
  public readonly status = 504;
  public readonly expose = true;
  constructor() {
    super("Engine did not respond in time");
  }
}

export class EngineOverloadedError extends Error {
  public readonly status = 503;
  public readonly expose = true;
  constructor() {
    super("Server is busy, please retry shortly");
  }
}

export class RedisManager {
  private publisher: RedisClientType;
  private subscriber: RedisClientType;
  private inFlight = 0;
  private static instance: RedisManager;

  private constructor() {
    if (!redisUrl) {
      throw new Error("REDIS_API_ENGINE_URL must be provided in environment variables.");
    }

    this.publisher = createClient({ url: redisUrl });
    this.subscriber = createClient({ url: redisUrl });

    this.publisher.on("error", (e) => console.error("Redis publisher error:", e.message));
    this.subscriber.on("error", (e) => console.error("Redis subscriber error:", e.message));

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

  public get pending() {
    return this.inFlight;
  }

  public sendAndAwait(message: MessageToEngine) {
    if (this.inFlight >= MAX_IN_FLIGHT) {
      return Promise.reject(new EngineOverloadedError());
    }

    return new Promise<MessageFromOrderbook>((resolve, reject) => {
      const id = this.getRandomClientId();
      this.inFlight++;

      let settled = false;
      const cleanup = () => {
        if (settled) return;
        settled = true;
        this.inFlight--;
        clearTimeout(timer);
        this.subscriber.unsubscribe(id).catch(() => { /* already gone */ });
      };

      const timer = setTimeout(() => {
        cleanup();
        reject(new EngineTimeoutError());
      }, ENGINE_TIMEOUT_MS);

      this.subscriber
        .subscribe(id, (raw: string) => {
          if (settled) return;
          cleanup();
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(new Error("Malformed response from engine"));
          }
        })
        .then(() =>
          this.publisher.lPush("messages", JSON.stringify({ clientId: id, message }))
        )
        .catch((e) => {
          cleanup();
          reject(e);
        });
    });
  }

  public getRandomClientId() {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }
}
