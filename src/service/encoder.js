'use strict';

// Babel Compiler
// -------------------------------------------------
Object.defineProperty(exports, '__esModule', {
	value: true
});
// -------------------------------------------------

const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const PATH = require('../utils/config');
const CONFIG = require('../utils/config');

/**
 * 480x270 @ 350 kbps video with 128 kbps audio (bits/pixel: 0.113)
 * 640x360 @ 650 kbps video with 128 kbps audio (bits/pixel: 0.118)
 * 960x540 @ 1400 kbps video with 128 kbps audio (bits/pixel: 0.112)
 * 1280x720 @ 2500 kbps video with 128 kbps audio (bits/pixel: 0.113)
 * 1920x1080 @ 5500 kbps video with 128 kbps audio (bits/pixel: 0.111)
 * 2560x1440 @ 10000 kbps video with 128 kbps audio (bits/pixel: 0.113)
 * 3840x2160 @ 22000 kbps video with 128 kbps audio (bits/pixel: 0.111)
 */
const videoBitrateMapper = {
	'360': '650',
	'480': '1400',
	'720': '2500',
	'1080': '5500'
};
const videoSizeMapper = {
	'360': '640x360',
	'480': '854x480',
	'720': '1280x720',
	'1080': '1920x1080'
};

const ensureExists = (path, mask, cb) => {
	if (typeof mask == 'function') {
		// allow the `mask` parameter to be optional
		cb = mask;
		mask = '0777';
	}
	fs.mkdir(path, mask, function(err) {
		if (err) {
			if (err.code == 'EEXIST')
				cb(null); // ignore the error if the folder already exists
			else cb(err); // something else went wrong
		} else cb(null); // successfully created folder
	});
};

// OUTPUT DIR
const OUTPUT_DIR = 'output';
// Set ffmpeg path.
ffmpeg.setFfmpegPath(PATH.FFMPEG_BIN);
ffmpeg.setFfprobePath(PATH.FFPROBE_BIN);

// Reading video metadata.
const getVideoMetadata = (exports.getVideoMetadata = (videoPath) => {
	return new Promise((resolve, reject) => {
		ffmpeg.ffprobe(path.resolve(videoPath), function(err, metadata) {
			if (!err) {
				resolve({
					video: metadata['streams'][0],
					audio: metadata['streams'][1]
				});
			} else {
				reject({ err });
			}
		});
	});
});

// Screenshot
const makeScreenshot = (exports.makeScreenShot = (task, resolve, reject, sizes) => {
	const startTime = Date.now();
	const videoPath = task.data.video_path;
	const outputName = task.data.video_name;
	const videoId = task.data.video_id;
	ffmpeg(videoPath)
		.screenshots({
			count: 10,
			folder: `${process.cwd()}/${OUTPUT_DIR}/${videoId}/${outputName}`
		})
		.on('start', function(commandLine) {
			console.log('#### [FFMPEG]: Start to make screenshoot.');
		})
		.on('end', () => {
			const endTime = Date.now();
			console.log(`#### [FFMPEG] screenshot completed after ${(endTime - startTime) / 1000} seconds`);
			resolve({
				encode_duration: (endTime - startTime) / 1000,
				endTime,
				sizes
			});
		})
		.on('error', function(err) {
			console.log('#### ffmpeg screenshot error: ' + err);
			reject({
				err
			});
		});
});

// Encode video to mp4 format.
const encodeVideo = (exports.encodeVideo = (task) => {
	let sizes = [];
	const videoId = task.data.video_id;
	const videoPath = task.data.video_path;
	const outputName = task.data.video_name;
	const outputDIR = `${process.cwd()}/${OUTPUT_DIR}/${videoId}`;
	const x264Command = [
		'-preset fast',
		'-movflags +faststart',
		'-r 24',
		'-profile:v main',
		'-x264opts keyint=48:min-keyint=48:no-scenecut',
		'-c:a aac',
		'-b:a 128k',
		'-ac 2'
	];
	return new Promise((resolve, reject) => {
		getVideoMetadata(videoPath)
			.then(async (mp4info) => {
				let result = null;
				const videoHeight = parseInt(mp4info.video.height, 10);
				if (videoHeight <= 360) {
					result = await processBySize(360, reject);
					result = await hlsSegmentVideo(videoId, outputName, videoSizeMapper[360]);
				} else if (videoHeight <= 480 && videoHeight > 360) {
					result = await Promise.all([ processBySize(360, reject), processBySize(480, reject) ]);
					result = await Promise.all([
						hlsSegmentVideo(videoId, outputName, videoSizeMapper[360]),
						hlsSegmentVideo(videoId, outputName, videoSizeMapper[480])
					]);
				} else if (videoHeight <= 720 && videoHeight > 480) {
					result = await Promise.all([
						processBySize(360, reject),
						processBySize(480, reject),
						processBySize(720, reject)
					]);
					result = await Promise.all([
						hlsSegmentVideo(videoId, outputName, videoSizeMapper[360]),
						hlsSegmentVideo(videoId, outputName, videoSizeMapper[480]),
						hlsSegmentVideo(videoId, outputName, videoSizeMapper[720])
					]);
				} else if ((videoHeight <= 1080 && videoHeight > 720) || videoHeight > 1080) {
					result = await Promise.all([
						processBySize(360, reject),
						processBySize(480, reject),
						processBySize(720, reject),
						processBySize(1080, reject)
					]);
					result = await Promise.all([
						hlsSegmentVideo(videoId, outputName, videoSizeMapper[360]),
						hlsSegmentVideo(videoId, outputName, videoSizeMapper[480]),
						hlsSegmentVideo(videoId, outputName, videoSizeMapper[720]),
						hlsSegmentVideo(videoId, outputName, videoSizeMapper[1080])
					]);
				}
				result && makeScreenshot(task, resolve, reject, sizes);
			})
			.catch((e) => {
				console.log('#### [FFPROBE] Get Video metedata Error: /n');
				console.log(e);
				reject(e);
			});
	});

	async function processBySize(size, reject) {
		try {
			const parameter = {
				videoBitrate: 0,
				videoSize: '',
				videoPath,
				videoId,
				outputName
			};
			parameter.videoSize = videoSizeMapper[size];
			parameter.videoBitrate = videoBitrateMapper[size];
			sizes.push(videoSizeMapper[size]);
			return await _encode(parameter);
		} catch (error) {
			reject(error);
		}
	}

	async function _encode(parameter) {
		const { videoPath, videoSize, videoBitrate, videoId, outputName } = parameter;
		return new Promise((resolve, reject) => {
			ensureExists(outputDIR, '0744', function(err) {
				const startTime = Date.now();
				if (err) console.log('#### [NODEJS] Create directory failed, ' + err);
				ffmpeg(videoPath)
					.videoBitrate(videoBitrate)
					.videoCodec('libx264')
					.addOutputOption(x264Command)
					.size(videoSize)
					.output(`${process.cwd()}/${OUTPUT_DIR}/${videoId}/${outputName}_${videoSize}.mp4`)
					.on('progress', function(progress) {
						task.reportProgress(progress.percent);
					})
					.on('start', function(commandLine) {
						console.log(`#### [FFMPEG]: Start to encode video with size: ${videoSize} ...`);
					})
					.on('end', function() {
						const endTime = Date.now();
						console.log(
							`#### [FFMPEG] Size ${videoSize} encode completed after ${(endTime - startTime) /
								1000} seconds`
						);
						resolve({
							encode_duration: (endTime - startTime) / 1000,
							endTime
						});
					})
					.on('error', function(err) {
						console.log(`### [FFMPEG] Size ${videoSize} ffmpeg error: ` + err);
						reject({ err });
					})
					.run();
			});
		});
	}
});

// http://elkpi.com/topics/ffmpeg-f-hls.html
const hlsSegmentVideo = (exports.hlsSegmentVideo = (videoId, videoName, videoSize) => {
	return new Promise((resolve, reject) => {
		let startTime = null;
		const videoPath = `${process.cwd()}/${OUTPUT_DIR}/${videoId}/${videoName}_${videoSize}.mp4`;
		ffmpeg(videoPath)
			.outputOptions([
				'-profile:v baseline', // baseline profile (level 3.0) for H264 video codec
				'-level 3.0',
				`-s ${videoSize}`, // output video dimensions
				'-start_number 0', // start the first .ts segment at index 0
				'-hls_time 10', // 10 second segment duration
				'-hls_list_size 0', // Maxmimum number of playlist entries (0 means all entries/infinite)
				`-hls_base_url http://${CONFIG.VIDEO_SERVER}/${videoId}/`,
				'-f hls' // HLS format
			])
			.output(`${process.cwd()}/${OUTPUT_DIR}/${videoId}/${videoName}_${videoSize}.m3u8`)
			.on('start', function() {
				startTime = Date.now();
				console.log(`#### [FFMPEG]: Start to encode video to support HLS with size: ${videoSize} ...`);
			})
			.on('end', function() {
				const endTime = Date.now();
				console.log(
					`#### [FFMPEG] Size ${videoSize} HLS support completed after ${(endTime - startTime) /
						1000} seconds`
				);
				resolve({
					encode_duration: (endTime - startTime) / 1000,
					endTime
				});
			})
			.on('error', function(err) {
				console.log(`### [FFMPEG] Size ${videoSize} HLS support error: ` + err);
				reject({ err });
			})
			.run();
	});
});

