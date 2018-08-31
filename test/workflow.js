const assert = require('assert');
const path = require('path');
const Queue = require('bee-queue');
const { createEncoderJOB, processJob } = require('../src/service/worker');

describe('Video Process Queue', function() {
	const fixture = {
		video_1: path.resolve(process.cwd(), 'test', 'fixtures', 'dbz.mp4')
	};
	before(() => {
		this.video_queue = video_queue = new Queue('video_encoder', {
			removeOnSuccess: false,
			stallInterval: 5000,
			delayedDebounce: 1000,
			redis: {
				host: CONFIG.REDIS_SERVER,
				port: 6379,
				db: 0
			}
		});

		this.video_queue.on('ready', () => {
			console.log('#### [BeeQueue]: queue now ready to start doing things.');
		});
		this.video_queue.on('error', (err) => {
			console.log(`#### [BeeQueue]: ${err.message}`);
		});
		this.video_queue.on('failed', (job, err) => {
			console.log(err);
			console.log(`#### [BeeQueue]: Job ${job.id} failed with error ${err.message}`);
		});
		this.video_queue.on('retrying', (job, err) => {
			console.log(`#### [BeeQueue]: Job ${job.id} failed with error ${err.message} but is being retried!`);
		});
		this.video_queue.on('stalled', (jobId) => {
			console.log(`#### [BeeQueue]: Job ${jobId} stalled and will be reprocessed`);
		});
		this.video_queue.on('job succeeded', (jobId, result) => {
			console.log(`#### [BeeQueue]: Job ${jobId} succeeded with total time: ${result.encode_duration}`);
		});
		this.video_queue.on('job failed', (jobId, err) => {
			console.log(`#### [BeeQueue]: Job ${jobId} failed with error ${err.message}`);
		});
		this.video_queue.on('job progress', (jobId, progress) => {
			console.log(`#### [BeeQueue]: Job ${jobId} reported progress: ${progress}%`);
		});
		this.video_queue.destroy();
		processJob(this.video_queue);
	});

	it('Should Execute a JOB', async () => {
		await createEncoderJOB({
			videoPath: fixture.video_1,
			videoName: '02 egghead nodejs create an api schema definition using swagger'
		});
	});
});
