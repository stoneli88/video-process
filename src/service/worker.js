const videoProcesser = require('./encoder');
const fetch = require('node-fetch');
const CONFIG = require('../utils/config');
const { execute, makePromise } = require('apollo-link');
const { HttpLink } = require('apollo-link-http');
const gql = require('graphql-tag');

// Babel Compiler
// -------------------------------------------------
Object.defineProperty(exports, '__esModule', {
	value: true
});
// -------------------------------------------------

// Use Apollo Link as a standalone client
const uri = 'http://localhost:4000';
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
	) {
		updateVideo(
			id: $id
			uuid: $uuid
			name: $name
			description: $description
			category: $category
			isEncoded: $isEncoded
			path: $path
		) {
			id
		}
	}
`;

const operation = {
	query: UPDATE_VIDEO_MUTATION,
	variables: {}
};

// create JOBS.
exports.createEncoderJOB = async (queue, jobData) => {
	const job = await queue
		.createJob({
			video_id: jobData.videoUUID,
			video_path: jobData.videoPath,
			video_name: jobData.videoName,
			video_dbid: jobData.videoID,
			job_created: jobData.created
		})
		.setId(jobData.videoUUID)
		.timeout(60 * 60 * 1000)
		.retries(1)
		.save();

	return job;
};

// process jobs.
exports.processJob = (queue) => {
	queue.process([ 1 ], (job, done) => {
		console.log(`#### [BeeQueue]: Processing job ${job.id}`);
		videoProcesser
			.encodeVideo(job)
			.then(async (ret) => {
				console.log('#### [MP4BOX] Start fragmentation the encoded video...');
				let { sizes } = ret;
				const { id, data } = job;
				const { video_name } = data;
				if (sizes) {
					sizes = sizes.map((size) => {
						return `${process.cwd()}/output/${job.data.video_id}/${job.data.video_name}_${size}.mp4#audio ${process.cwd()}/output/${job.data.video_id}/${job.data.video_name}_${size}.mp4#video`
					}).join(' ');
					const fragRet = await videoProcesser.fragmentationVideo(id, video_name, sizes);
					fragRet && handleSucc(job, done, ret);
				}
			})
			.catch((error) => {
				handleErr(job, done);
				done('#### [FFMPEG] Error: ' + JSON.stringify(error));
				console.log(error);
			});
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

	function handleSucc(job, done, ret) {
		operation.variables = {
			id: job.data.video_dbid,
			isEncoded: 'Yes',
			path: `${CONFIG.VIDEO_SERVER}/${job.data.video_id}/manifest.xml`
		};
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
				// console.log(buffer.toString());
			}, data => {
				console.error(`#### [RSYNC] Error when execute: ${data}`);
				process.exit();
			});
		});
	}
};
