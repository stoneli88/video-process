import * as BeeQueue from "bee-queue";

import { logger } from "../utils/logger";
import { createHLS } from "./video";

import {
  JOB_MAX_RETRY,
  REDIS_SERVER,
  REDIS_SERVER_PORT,
  QUEUE_CONCURRENCY
} from "../utils/constants";

export interface IVideoJob {
  type: string;
  videoId: string;
  videoUuid: string;
  coverUuid: string;
  created?: string;
}

export default class Queue {
  public static getInstance(
    name: string,
    options?: BeeQueue.QueueSettings
  ): Queue {
    if (!this.instance) {
      this.instance = new Queue(name, options ? options : this.defaultOpts);
    }
    return this.instance;
  }

  private static instance: Queue;
  private static readonly defaultOpts: BeeQueue.QueueSettings = {
    prefix: `vp`,
    stallInterval: 5000,
    nearTermWindow: 1200000,
    delayedDebounce: 1000,
    redis: {
      port: REDIS_SERVER_PORT,
      host: REDIS_SERVER,
      db: 0
    },
    isWorker: true,
    getEvents: true,
    sendEvents: true,
    storeJobs: true,
    ensureScripts: true,
    activateDelayedJobs: false,
    removeOnSuccess: false,
    removeOnFailure: false,
    redisScanCount: 100
  };

  private queueInstance: BeeQueue;

  constructor(name: string, options: BeeQueue.QueueSettings) {
    this.queueInstance = new BeeQueue(name, options);
    this.bindEvtToQueue();
  }

  public createJob(jobDetail: IVideoJob): Promise<BeeQueue.Job> {
    logger.info(`#### [BeeQueue]: creating job with type ${jobDetail.type}`);
    return this.queueInstance
      .createJob(jobDetail)
      .setId(jobDetail.videoId)
      .retries(JOB_MAX_RETRY)
      .timeout(10000)
      .backoff("fixed", 6 * 1000)
      .save();
  }

  public getJob(jobId: string): Promise<BeeQueue.Job> {
    logger.info(`#### [BeeQueue]: get job with job id is: ${jobId}`);
    return this.queueInstance.getJob(jobId);
  }

  public getJobs(type: string, page: BeeQueue.Page): Promise<BeeQueue.Job[]> {
    logger.info(`#### [BeeQueue]: get all jobs with job type is: ${type}`);
    return this.queueInstance.getJobs(type, page);
  }

  public process(): void {
    this.queueInstance.process(
      QUEUE_CONCURRENCY,
      (job: BeeQueue.Job, done: BeeQueue.DoneCallback<any>) => {
        createHLS(job)
          .then((ret: any) => {
            done(null, ret);
          })
          .catch(e => {
            logger.error(`#### [BeeQueue]: Create HLS found error: ${e}`);
          });
      }
    );
  }

  private bindEvtToQueue() {
    this.queueInstance.on("job succeeded", (jobId: string, result: any) => {
      logger.error(`#### [BeeQueue]: Job ${jobId} failed with error ${result}`);
    });
    this.queueInstance.on("job retrying", (jobId: string, err: Error) => {
      logger.error(
        `#### [BeeQueue]: Job ${jobId} failed with error ${
          err.message
        } but is being retried!`
      );
    });
    this.queueInstance.on("job failed", (jobId: string, err: Error) => {
      logger.error(
        `#### [BeeQueue]: Job ${jobId} failed with error ${err.message}`
      );
    });
    this.queueInstance.on("job progress", (jobId, progress) => {
      console.log(`Job ${jobId} reported progress: ${progress}%`);
    });
  }
}
