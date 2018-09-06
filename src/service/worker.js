const videoProcesser = require('./encoder');
const fetch = require('node-fetch');
const CONFIG = require('../utils/config');
const { execute, makePromise } = require('apollo-link');
const { HttpLink } = require('apollo-link-http');
const gql = require('graphql-tag');
const { getVideoMetadata } = require('./encoder');
const log = require('single-line-log');

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
	mutation UpdateVideoMutation(
		$id: String!
		$uuid: String
		$name: String
		$description: String
		$category: String
		$isEncoded: String
		$path: String
		$channel: String
		$duration: String
		$framerate: String
		$hd: Boolean
		$preview_url: String
	) {
		updateVideo(
			id: $id
			uuid: $uuid
			name: $name
			description: $description
			category: $category
			isEncoded: $isEncoded
			path: $path
			channel: $channel,
			duration: $duration,
			framerate: $framerate,
			hd: $hd,
			preview_url: $preview_url
		) {
			id
		}
	}
`;

const operation = {
	query: UPDATE_VIDEO_MUTATION,
	variables: {}
};

// Create video job with type.
exports.createJob = async (queue, jobData) => {
	const job = await queue
		.createJob({
			video_id: jobData.videoUUID,
			video_path: jobData.videoPath,
			video_name: jobData.videoName,
			video_dbid: jobData.videoID,
			job_type: jobData.jobType,
			job_created: jobData.created
		})
		.setId(jobData.videoUUID)
		.timeout(60 * 60 * 1000)
		.retries(3)
		.save();

	return job;
};

// process jobs.
exports.processJob = (queue) => {
	queue.process([ 1 ], (job, done) => {
		console.log(`#### [BeeQueue]: Processing ${job.id} which TYPE is ${job.type} ...`);
		handleRuning(job, done);
		switch (job.job_type) {
			case 'DWN':
				videoProcesser
					.createDownloadableVideo(job)
					.then(async (ret) => {
						ret && handleSucc(job, done, ret);
					})
					.catch((error) => {
						handleErr(job, done);
						done('#### [FFMPEG][TYPE:DWN] Error: ' + JSON.stringify(error));
						console.log(error);
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
						console.log(error);
					});
				break;
			default:
				break;
		}
	});

	function handleErr(job, done) {
		operation.variables = {
			id: job.data.video_dbid,
			path: `${CONFIG.VIDEO_SERVER}/${job.data.video_id}/${job.data.video_name}_${job.data
				.video_size}_dashinit.mp4`,
			isEncoded: 'ERROR'
		};
		makePromise(execute(link, operation)).catch((error) => {
			console.log(`#### [GQL] While SET isEncoded is ERROR received error ${error}`);
			done(err);
		});
	}

	function handleRuning(job, done) {
		operation.variables = {
			id: job.data.video_dbid,
			path: `${CONFIG.VIDEO_SERVER}/${job.data.video_id}/${job.data.video_name}_${job.data
				.video_size}_dashinit.mp4`,
			isEncoded: 'RUNING'
		};
		makePromise(execute(link, operation)).catch((error) => {
			console.log(`#### [GQL] While SET isEncoded is RUNING received error ${error}`);
			done(err);
		});
	}

	function handleSucc(job, done, ret) {
		operation.variables = {
			id: job.data.video_dbid,
			isEncoded: 'Yes',
			path: `${CONFIG.VIDEO_SERVER}/${job.data.video_id}/manifest.xml`
		};
		getVideoMetadata(job.data.video_path).then((mp4Info) => {
			console.log(mp4Info);
			makePromise(execute(link, operation)).then((data) => {
				console.log('#### [RSYNC] Start sync the encoded video to file server.');
				global.rsync.execute((error, code, cmd) => {
					// we're done
					if (error) {
						console.error(`#### [RSYNC] Error when execute: ${error}`);
						process.exit();
					}
					console.log(`#### [RSYNC] Sync successfully done.`);
					done(null, ret);
				}, data => {
					const buffer = Buffer.from(data);
					log(`${buffer.toString()}\n`);
				}, data => {
					console.error(`#### [RSYNC] Error when execute: ${data}`);
					process.exit();
				});
			});
		});
	}
};
