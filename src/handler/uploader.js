"use strict";

// Babel Compiler
// -------------------------------------------------
Object.defineProperty(exports, "__esModule", {
  value: true
});
// -------------------------------------------------
const fs = require("fs");
const path = require("path");
const mkdirp = require("mkdirp");
const rimraf = require("rimraf");
const multiparty = require("multiparty");

const fileInputName = process.env.FILE_INPUT_NAME || "qqfile";
const maxFileSize = process.env.MAX_FILE_SIZE || 0; // in bytes, 0 for unlimited
const uploadedFilesPath = process.env.UPLOADED_FILES_DIR || path.resolve(process.cwd(), "tmp", "tmp_video-");
const chunkDirName = "chunks";

const onUpload = (exports.onUpload = (req, res) => {
  const form = new multiparty.Form();
  form.parse(req, (err, fields, files) => {
    if (err) {
      console.err(err.message);
      console.err(err.stack);
    } else {
      var partIndex = fields.qqpartindex;
      // text/plain is required to ensure support for IE9 and older
      res.set("Content-Type", "text/plain");
      if (partIndex == null) {
        onSimpleUpload(fields, files[fileInputName][0], res);
      } else {
        onChunkedUpload(fields, files[fileInputName][0], res);
      }
    }
  });
});

const onDeleteFile = (exports.onDeleteFile = (req, res) => {
  const uuid = req.params.uuid;
  const dirToDelete = uploadedFilesPath + uuid;

  rimraf(dirToDelete, error => {
    if (error) {
      console.error("Problem deleting file! " + error);
      res.status(500);
    }

    res.send();
  });
});

// NORMAL UPLOAD.
const onSimpleUpload = (fields, file, res) => {
  const uuid = fields.qquuid;
  const responseData = {
    success: false
  };

  file.name = fields.qqfilename;

  if (isValid(file.size)) {
    moveUploadedFile(
      file,
      uuid,
      () => {
        responseData.success = true;
        responseData.uuid = uuid;
        res.send(responseData);
      },
      () => {
        responseData.error = "Problem copying the file!";
        res.send(responseData);
      }
    );
  } else {
    failWithTooBigFile(responseData, res);
  }
};

// CHUNK UPLOAD.
const onChunkedUpload = (fields, file, res) => {
  const size = parseInt(fields.qqtotalfilesize);
  const uuid = fields.qquuid;
  const index = fields.qqpartindex;
  const totalParts = parseInt(fields.qqtotalparts);
  const responseData = {
    success: false
  };

  file.name = fields.qqfilename;

  if (isValid(size)) {
    storeChunk(
      file,
      uuid,
      index,
      totalParts,
      () => {
        if (index < totalParts - 1) {
          responseData.success = true;
          responseData.uuid= uuid;
          res.send(responseData);
        } else {
          combineChunks(
            file,
            uuid,
            () => {
              responseData.success = true;
              responseData.uuid= uuid;
              res.send(responseData);
            },
            () => {
              responseData.error = "Problem conbining the chunks!";
              res.send(responseData);
            }
          );
        }
      },
      reset => {
        responseData.error = "Problem storing the chunk!";
        res.send(responseData);
      }
    );
  } else {
    failWithTooBigFile(responseData, res);
  }
};

const failWithTooBigFile = (responseData, res) => {
  responseData.error = "Too big!";
  responseData.preventRetry = true;
  res.send(responseData);
};

const moveFile = (
  destinationDir,
  sourceFile,
  destinationFile,
  success,
  failure
) => {
  mkdirp(destinationDir, function(error) {
    var sourceStream, destStream;

    if (error) {
      console.error(
        "Problem creating directory " + destinationDir + ": " + error
      );
      failure();
    } else {
      sourceStream = fs.createReadStream(sourceFile);
      destStream = fs.createWriteStream(destinationFile);

      sourceStream
        .on("error", function(error) {
          console.error("Problem copying file: " + error.stack);
          destStream.end();
          failure();
        })
        .on("end", function() {
          destStream.end();
          success();
        })
        .pipe(destStream);
    }
  });
};

const moveUploadedFile = (file, uuid, success, failure) => {
  const destinationDir = uploadedFilesPath + uuid + "/";
  const fileDestination = destinationDir + file.name;

  moveFile(destinationDir, file.path, fileDestination, success, failure);
};

const storeChunk = (file, uuid, index, numChunks, success, failure) => {
  const destinationDir = uploadedFilesPath + uuid + "/" + chunkDirName + "/";
  const chunkFilename = getChunkFilename(index, numChunks);
  const fileDestination = destinationDir + chunkFilename;

  moveFile(destinationDir, file.path, fileDestination, success, failure);
};

const combineChunks = (file, uuid, success, failure) => {
  const chunksDir = uploadedFilesPath + uuid + "/" + chunkDirName + "/";
  const destinationDir = uploadedFilesPath + uuid + "/";
  const fileDestination = destinationDir + file.name;

  fs.readdir(chunksDir, function(err, fileNames) {
    let destFileStream;

    if (err) {
      console.error("Problem listing chunks! " + err);
      failure();
    } else {
      fileNames.sort();
      destFileStream = fs.createWriteStream(fileDestination, {
        flags: "a"
      });

      appendToStream(
        destFileStream,
        chunksDir,
        fileNames,
        0,
        () => {
          rimraf(chunksDir, rimrafError => {
            if (rimrafError) {
              logger.info("Problem deleting chunks dir! " + rimrafError);
            }
          });
          success();
        },
        failure
      );
    }
  });
};

const appendToStream = (
  destStream,
  srcDir,
  srcFilesnames,
  index,
  success,
  failure
) => {
  if (index < srcFilesnames.length) {
    fs.createReadStream(srcDir + srcFilesnames[index])
      .on("end", () => {
        appendToStream(
          destStream,
          srcDir,
          srcFilesnames,
          index + 1,
          success,
          failure
        );
      })
      .on("error", error => {
        console.error("Problem appending chunk! " + error);
        destStream.end();
        failure();
      })
      .pipe(
        destStream,
        { end: false }
      );
  } else {
    destStream.end();
    success();
  }
};

const getChunkFilename = (index, count) => {
  const digits = new String(count).length;
  const zeros = new Array(digits + 1).join("0");

  return (zeros + index).slice(-digits);
};

const isValid = size => {
  return maxFileSize === 0 || size < maxFileSize;
};
