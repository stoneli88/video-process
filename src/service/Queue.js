"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BeeQueue = require("bee-queue");
const logger_1 = require("../utils/logger");
const video_1 = require("./video");
const constants_1 = require("../utils/constants");
class Queue {
    constructor(name, options) {
        this.queueInstance = new BeeQueue(name, options);
        this.bindEvtToQueue();
    }
    static getInstance(name, options) {
        if (!this.instance) {
            this.instance = new Queue(name, options ? options : this.defaultOpts);
        }
        return this.instance;
    }
    createJob(jobDetail) {
        logger_1.logger.info(`#### [BeeQueue]: creating job with type ${jobDetail.type}`);
        return this.queueInstance
            .createJob(jobDetail)
            .setId(jobDetail.videoId)
            .retries(constants_1.JOB_MAX_RETRY)
            .timeout(10000)
            .backoff("fixed", 6 * 1000)
            .save();
    }
    getJob(jobId) {
        logger_1.logger.info(`#### [BeeQueue]: get job with job id is: ${jobId}`);
        return this.queueInstance.getJob(jobId);
    }
    getJobs(type, page) {
        logger_1.logger.info(`#### [BeeQueue]: get all jobs with job type is: ${type}`);
        return this.queueInstance.getJobs(type, page);
    }
    process() {
        this.queueInstance.process(constants_1.QUEUE_CONCURRENCY, (job, done) => {
            video_1.createHLS(job)
                .then((ret) => {
                done(null, ret);
            })
                .catch(e => {
                logger_1.logger.error(`#### [BeeQueue]: Create HLS found error: ${e}`);
            });
        });
    }
    bindEvtToQueue() {
        this.queueInstance.on("job succeeded", (jobId, result) => {
            logger_1.logger.error(`#### [BeeQueue]: Job ${jobId} failed with error ${result}`);
        });
        this.queueInstance.on("job retrying", (jobId, err) => {
            logger_1.logger.error(`#### [BeeQueue]: Job ${jobId} failed with error ${err.message} but is being retried!`);
        });
        this.queueInstance.on("job failed", (jobId, err) => {
            logger_1.logger.error(`#### [BeeQueue]: Job ${jobId} failed with error ${err.message}`);
        });
        this.queueInstance.on("job progress", (jobId, progress) => {
            console.log(`Job ${jobId} reported progress: ${progress}%`);
        });
    }
}
Queue.defaultOpts = {
    prefix: `vp`,
    stallInterval: 5000,
    nearTermWindow: 1200000,
    delayedDebounce: 1000,
    redis: {
        port: constants_1.REDIS_SERVER_PORT,
        host: constants_1.REDIS_SERVER,
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
exports.default = Queue;
