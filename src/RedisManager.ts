import { RedisClientType, createClient } from "redis";
import { MessageFromOrderbook } from "./types";
import { MessageToEngine } from "./types/to";
import { pusherCluster, pusherId, redisUrl } from "./config";
import Pusher from "pusher-js";

export class RedisManager {
  //   private client: RedisClientType; //Client is our PubSub
  private publisher: RedisClientType; //here the Publisher is the Queue
  private pusherClient: Pusher;
  private static instance: RedisManager;

  private constructor() {
    if (!redisUrl) {
      console.log(
        "Redis URL and token must be provided in environment variables."
      );
      throw new Error(
        "Redis URL and token must be provided in environment variables."
      );
    }
    this.pusherClient = new Pusher(pusherId, {
      cluster: pusherCluster,
    });
    console.log("Pusher Client Initialized");

    // this.client = createClient({
    //   url: redisUrl,
    // });
    // this.client.connect();

    this.publisher = createClient({
      url: redisUrl,
    });
    this.publisher.connect();
    console.log("🍾 Connected to Redis Queue");
  }

  public static getInstance() {
    if (!this.instance) {
      this.instance = new RedisManager();
    }
    return this.instance;
  }

  public sendAndAwait(message: MessageToEngine) {
    return new Promise<MessageFromOrderbook>((resolve) => {
      //This Resolve is a Function which is called when we want something that promise need to return
      const id = this.getRandomClientId();
      //   this.client.subscribe(id, (message: string) => { //Before adding to the Queue, It is Subscribing the User to the PubSub
      //     this.client.unsubscribe(id); // When we get the Message from the PubSub then we UnSubscribes from the PubSub
      //     resolve(JSON.parse(message)); // message received will be returned to the user
      // });
      console.log("message: ", message ,"to be sent to the Engine on Id" , id);

      const channel = this.pusherClient.subscribe(id);
      channel.bind("my-event", (data: any) => {
        console.log("data: ", data);

        this.pusherClient.unsubscribe(id);
        resolve(data);
      });
      //We will send the ID of PubSub to the Engine via Queue
      this.publisher.lPush(
        "messages",
        JSON.stringify({ clientId: id, message })
      ); //Here the Api Server adding the User in the Queue
    });
  }

  public getRandomClientId() {
    //This is the orderId of the Order
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }
}
