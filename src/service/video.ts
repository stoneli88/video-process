import cpFile from "cp-file";
import mkdirp from "mkdirp";
import { execFile, exec } from "child_process";
import * as BeeQueue from "bee-queue";

// OUTPUT DIR
const OUTPUT_DIR = "output";

// https://gist.github.com/mrbar42/ae111731906f958b396f30906004b3fa
export const createHLS = async (task: BeeQueue.Job) => {
  let startTime;
  await new Promise((resolve, reject) => {
    const videoId = task.data.video_dbid;
    const outputDIR = `${process.cwd()}/${OUTPUT_DIR}/${videoId}`;
    exec(`chmod +x ${process.cwd()}/bin/create-vod-hls.sh`, error => {
      task.reportProgress(10);
      startTime = Date.now();
      if (error) {
        reject(error);
      }
      mkdirp(outputDIR, async err => {
        if (err) {
          reject(error);
        }
        task.reportProgress(20);
        await cpFile(task.data.coverPath, `${outputDIR}/cover.png`);
        task.reportProgress(30);
        execFile(
          `${process.cwd()}/bin/create-vod-hls.sh`,
          [task.data.videoPath, outputDIR],
          error => {
            if (error) {
              reject(error);
            }
            const endTime = Date.now();
            task.reportProgress(90);
            resolve({
              encode_duration: (endTime - startTime) / 1000,
              endTime
            });
          }
        );
      });
    });
  });
};
