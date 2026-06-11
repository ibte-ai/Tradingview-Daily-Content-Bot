import { postQueue } from "./queues/post.queue";
import { logger } from "./config/logger";
import { closeRedis } from "./config/redis";

async function runTest() {
  logger.info("Testing connection to Upstash Redis queue...");
  try {
    const job = await postQueue.add(
      "capture-chart",
      {
        symbol: "BTCUSD"
      }
    );
    logger.info(`Job added successfully! Job ID: ${job.id}`);
    console.log("Redis Connected Successfully");
  } catch (error) {
    logger.error("Error adding job to queue:", error);
    console.error("Redis Connection Failed:", error);
  } finally {
    // Gracefully close connections so the process can exit
    try {
      await postQueue.close();
      await closeRedis();
      logger.info("Test connection closed gracefully");
    } catch (closeError) {
      logger.error("Error closing connections:", closeError);
    }
  }
}

runTest();
