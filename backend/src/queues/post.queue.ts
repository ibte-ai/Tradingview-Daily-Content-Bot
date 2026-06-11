import { Queue } from "bullmq";
import { redis } from "../config/redis";

export const postQueue = new Queue(
  "trading-posts",
  {
    connection: redis as any
  }
);
