const fetch = require('node-fetch');
const { execute, makePromise } = require('apollo-link');
const { HttpLink } = require('apollo-link-http');
const gql = require('graphql-tag');
const log = require('single-line-log');
const BeeQueue = require('bee-queue');

const CONFIG = require('../utils/config');
const videoProcesser = require('./video');
const { getVideoMetadata } = require('./video');

// Babel Compiler
// -------------------------------------------------
Object.defineProperty(exports, '__esModule', {
	value: true
});
// -------------------------------------------------

// Use Apollo Link as a standalone client
const uri = CONFIG.GRAPHQL_ENDPOINT;
const link = new HttpLink({ uri, fetch });
const UPDATE_VIDEO_MUTATION = gql`
	mutation UpdateVideoMutation($id: String!, $isEncoded: String!, $dynamicRes: String, $manualRes: String) {
		updateVideo(id: $id, isEncoded: $isEncoded, dynamicRes: $dynamicRes, manualRes: $manualRes) {
			id
		}
	}
`;

const operation = {
	query: UPDATE_VIDEO_MUTATION,
	variables: {}
};

const queue = (exports.video_queue = new BeeQueue('video-processer', {
	prefix: 'bq',
	stallInterval: 5000,
	nearTermWindow: 1200000,
	delayedDebounce: 1000,
	redis: {
		port: CONFIG.REDIS_SERVER_PORT,
		host: CONFIG.REDIS_SERVER,
		db: 0 // if provided select a non-default redis db
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
}));

queue.on('ready', () => {
	logger.info('#### [BeeQueue]: queue now ready to start doing things.');
});
queue.on('error', (err) => {
	logger.error(`#### [BeeQueue]: ${err.message}`);
});
queue.on('failed', (job, err) => {
	logger.error(`#### [BeeQueue]: Job ${job.id} failed with error ${err.message}`);
});
queue.on('retrying', (job, err) => {
	logger.info(`#### [BeeQueue]: Job ${job.id} failed with error ${err.message} but is being retried!`);
});
queue.on('stalled', (jobId) => {
	logger.info(`#### [BeeQueue]: Job ${jobId} stalled and will be reprocessed`);
});
queue.on('job succeeded', (jobId, result) => {
	logger.info(`#### [BeeQueue]: Job ${jobId} succeeded with total time: ${result.encode_duration}`);
});
queue.on('job failed', (jobId, err) => {
	logger.info(`#### [BeeQueue]: Job ${jobId} failed with error ${err.message}`);
});
queue.on('job progress', (jobId, progress) => {
	logger.info(`#### [BeeQueue]: Job ${jobId} reported progress: ${progress}%\n`);
});

queue.process([ 1 ], (job, done) => {
	logger.info(`#### [BeeQueue]: Processing ${job.data.video_dbid} which TYPE is ${job.data.job_type} ...`);
	handleRuning(job, done);
	switch (job.data.job_type) {
		case 'DWN':
			videoProcesser
				.createDownloadableVideo(job)
				.then(async (ret) => {
					videoProcesser.createThumbnails(job.data.videoPath).then(() => {
						ret && handleSucc(job, done, ret);
					});
				})
				.catch((error) => {
					handleErr(job, done);
					done('#### [FFMPEG][TYPE:DWN] Error: ' + JSON.stringify(error));
					logger.error(error);
				});
			break;
		case 'HLS':
			videoProcesser
				.createVODByHLS(job)
				.then(async (ret) => {
					ret && handleSucc(job, done, ret);
				})
				.catch((error) => {
					handleErr(job, done);
					done('#### [FFMPEG][TYPE:HLS] Error: ' + JSON.stringify(error));
					logger.error(error);
				});
			break;
		default:
			break;
	}
});

function handleErr(job, done) {
	operation.variables = {
		id: job.data.video_dbid,
		isEncoded: 'ERROR'
	};
	makePromise(execute(link, operation)).catch((error) => {
		logger.info(`#### [GQL] While SET isEncoded is ERROR received error ${error}`);
		done(err);
	});
}
function handleRuning(job, done) {
	operation.variables = {
		id: job.data.video_dbid,
		isEncoded: 'RUNING'
	};
	makePromise(execute(link, operation)).catch((error) => {
		logger.info(`#### [GQL] While SET isEncoded is RUNING received error ${error}`);
		done(err);
	});
}
function handleSucc(job, done, ret) {
	operation.variables = {
		id: job.data.video_dbid,
		isEncoded: 'Yes',
		dynamicRes: '',
		manualRes: ''
	};
	if (job.data.job_type === 'DWN') {
		getVideoMetadata(job.data.videoPath).then((mp4info) => {
			const videoHeight = parseInt(mp4info.video.height, 10);
			if (videoHeight <= 360) {
				operation.variables.manualRes = `${CONFIG.VIDEO_SERVER}/${job.data.video_dbid}/${job.data
					.mov_name}_640x360`;
			} else if (videoHeight <= 480 && videoHeight > 360) {
				operation.variables.manualRes = [
					`${CONFIG.VIDEO_SERVER}/${job.data.video_dbid}/${job.data.mov_name}_640x360`,
					`${CONFIG.VIDEO_SERVER}/${job.data.video_dbid}/${job.data.mov_name}_854x480`
				].join(',');
			} else if (videoHeight <= 720 && videoHeight > 480) {
				operation.variables.manualRes = [
					`${CONFIG.VIDEO_SERVER}/${job.data.video_dbid}/${job.data.mov_name}_640x360`,
					`${CONFIG.VIDEO_SERVER}/${job.data.video_dbid}/${job.data.mov_name}_854x480`,
					`${CONFIG.VIDEO_SERVER}/${job.data.video_dbid}/${job.data.mov_name}_1280x720`
				].join(',');
			} else if ((videoHeight <= 1080 && videoHeight > 720) || videoHeight > 1080) {
				operation.variables.manualRes = [
					`${CONFIG.VIDEO_SERVER}/${job.data.video_dbid}/${job.data.mov_name}_640x360`,
					`${CONFIG.VIDEO_SERVER}/${job.data.video_dbid}/${job.data.mov_name}_854x480`,
					`${CONFIG.VIDEO_SERVER}/${job.data.video_dbid}/${job.data.mov_name}_1280x720`,
					`${CONFIG.VIDEO_SERVER}/${job.data.video_dbid}/${job.data.mov_name}_1920x1080`
				].join(',');
			}
			whenSuccess(link, operation, done);
		});
	}
	if (job.data.job_type === 'HLS') {
		operation.variables.dynamicRes = `${CONFIG.VIDEO_SERVER}/${job.data.video_dbid}/playlist.m3u8`;
		whenSuccess(link, operation, done);
	}

	function whenSuccess(link, operation, done) {
		makePromise(execute(link, operation)).then((data) => {
			logger.info('#### [RSYNC] Start sync the encoded video to file server.');
			global.rsync.execute(
				(error, code, cmd) => {
					// we're done
					if (error) {
						console.error(`#### [RSYNC] Error when execute: ${error}`);
						process.exit();
					}
					logger.info(`#### [RSYNC] Sync successfully done.`);
					done(null, ret);
				},
				(data) => {
					const buffer = Buffer.from(data);
					log(`${buffer.toString()}\n`);
				},
				(data) => {
					console.error(`#### [RSYNC] Error when execute: ${data}`);
					process.exit();
				}
			);
		});
	}
}

// Create video job with type.
exports.createJob = (jobData, callback) => {
	const jobType = jobData.jobType === 'DWN' ? 'VIDEO_CONVERSION-DWN' : 'VIDEO_CONVERSION-HLS';
	logger.info(`#### [Bee-Queue]: creating job with type ${jobType}`);
	const job = queue
		.createJob({
			videoPath: jobData.videoPath,
			coverPath: jobData.coverPath,
			cover_name: jobData.cover_name,
			cover_uuid: jobData.cover_uuid,
			mov_name: jobData.mov_name,
			mov_uuid: jobData.mov_uuid,
			video_dbid: jobData.videoID,
			job_type: jobData.jobType,
			job_created: jobData.created
		})
		.retries(1)
		.backoff('fixed', 60 * 1000)
		.save()
		.then(() => {
			callback.apply(this, [jobData]);
		});

	return job;
};
