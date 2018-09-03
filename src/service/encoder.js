'use strict';

// Babel Compiler
// -------------------------------------------------
Object.defineProperty(exports, '__esModule', {
	value: true
});
// -------------------------------------------------

const fs = require('fs');
const xml2js = require('xml2js');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const PATH = require('../utils/config');
const CONFIG = require('../utils/config');
const exec = require('child_process').exec;

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

// Encode video
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
				} else if (videoHeight <= 480 && videoHeight > 360) {
					result = await Promise.all([ processBySize(360, reject), processBySize(480, reject) ]);
				} else if (videoHeight <= 720 && videoHeight > 480) {
					result = await Promise.all([
						processBySize(360, reject),
						processBySize(480, reject),
						processBySize(720, reject)
					]);
				} else if ((videoHeight <= 1080 && videoHeight > 720) || videoHeight > 1080) {
					result = await Promise.all([
						processBySize(360, reject),
						processBySize(480, reject),
						processBySize(720, reject),
						processBySize(1080, reject)
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

// fragmentation video.
// remeber install mp4box in you OS from https://gpac.wp.imt.fr/downloads/.
const fragmentationVideo = (exports.fragmentationVideo = (jobId, video_name, videoPath) => {
	return new Promise((resolve, reject) => {
		exec(
			`mp4box -dash 4000 -rap -profile live -bs-switching no -mpd-title ${video_name} -base-url http://${CONFIG.VIDEO_SERVER}/${jobId} -out ${process.cwd()}/output/${jobId}/manifest.mpd ${videoPath}`,
			(error, stdout, stderr) => {
				if (error) {
					console.log(`#### [MP4BOX] Error when fragmentation video : ${error}`);
					reject(error);
				} else {
					// rename file extension to xml.
					const parser = new xml2js.Parser();
					fs.rename(
						`${process.cwd()}/output/${jobId}/manifest.mpd`,
						`${process.cwd()}/output/${jobId}/manifest.xml`,
						function(err) {
							if (error) {
								console.log(`#### [MP4BOX] Error when fragmentation video : ${error}`);
								reject(error);
							} else {
								console.log('#### [MP4BOX] fragmentation video successful.');
								fs.readFile(`${process.cwd()}/output/${jobId}/manifest.xml`, 'utf-8', function(
									err,
									data
								) {
									if (err) {
										console.log(`#### [MP4BOX] Error when read xml : ${error}`);
										reject(error);
									}
									parser.parseString(data, function(err, res) {
										if (err) throw err;
										const { MPD } = res;
										const { $, Period, ProgramInformation, BaseURL } = MPD;
										const { duration, AdaptationSet } = Period.$;
										// AdaptationSet.map();
										resolve({
											path: `${process.cwd()}/output/${jobId}/manifest.xml`
										});
									});
								});
							}
						}
					);
				}
			}
		);
	});
});
