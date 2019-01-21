"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cp_file_1 = require("cp-file");
const mkdirp_1 = require("mkdirp");
const child_process_1 = require("child_process");
// OUTPUT DIR
const OUTPUT_DIR = "output";
// https://gist.github.com/mrbar42/ae111731906f958b396f30906004b3fa
exports.createHLS = async (task) => {
    let startTime;
    await new Promise((resolve, reject) => {
        const videoId = task.data.video_dbid;
        const outputDIR = `${process.cwd()}/${OUTPUT_DIR}/${videoId}`;
        child_process_1.exec(`chmod +x ${process.cwd()}/bin/create-vod-hls.sh`, error => {
            task.reportProgress(10);
            startTime = Date.now();
            if (error) {
                reject(error);
            }
            mkdirp_1.default(outputDIR, async (err) => {
                if (err) {
                    reject(error);
                }
                task.reportProgress(20);
                await cp_file_1.default(task.data.coverPath, `${outputDIR}/cover.png`);
                task.reportProgress(30);
                child_process_1.execFile(`${process.cwd()}/bin/create-vod-hls.sh`, [task.data.videoPath, outputDIR], error => {
                    if (error) {
                        reject(error);
                    }
                    const endTime = Date.now();
                    task.reportProgress(90);
                    resolve({
                        encode_duration: (endTime - startTime) / 1000,
                        endTime
                    });
                });
            });
        });
    });
};
