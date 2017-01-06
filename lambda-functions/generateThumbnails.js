'use strict';


/***
  Generate thumbnails for the uploaded pictures and put them in the folder 'thumbnails' in the same bucket.
Forked from https://github.com/awslabs/create-thumbnails-lambda

***/

const im = require('imagemagick');
const fs = require('fs');
const async = require('async');
const util = require('util');
const aws = require('aws-sdk');
const gm = require('gm').subClass({
    imageMagick: true
});
const crypto = require('crypto');


// get reference to S3 client 
var s3 = new aws.S3();

exports.handler = function(event, context) {

    var srcBucket = event.Records[0].s3.bucket.name;
    // Object key may have spaces or unicode non-ASCII characters.
    var srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
    var dstBucket = srcBucket;
    var originalFileDigest = srcKey.substring('nuxeo'.length + 1, srcKey.length)


    // Download the image from S3, transform, and upload to a different folder in the S3 bucket.
    async.waterfall([
        function download(next) {
            // Download the image from S3 into a buffer.
            s3.getObject({
                    Bucket: srcBucket,
                    Key: srcKey
                },
                next);
        },


        function identify(response, next) {
            gm(response.Body, srcKey).identify(function(err, data) {
                if (!err && data.format == 'JPEG') {
                    next(null, response, 'jpg');
                } else if (!err && data.format == 'PNG') {
                    next(null, response, 'jpg');
                } else {
                    next(err);
                    console.log('skipping non-image: ' + srcKey + ' format:' + data.format);
                }
            });
        },
        function tranform(response, imageType, next) {

            gm(response.Body, srcKey).size(function(err, size) {
                this.resize(75, 100)
                    .toBuffer(imageType, function(err, buffer) {
                        if (err) {
                            next(err);
                        } else {
                            next(null, response.ContentType, buffer);
                        }
                    });
            });
        },

        function upload(contentType, data, next) {

            var digest = crypto.createHash('md5').update(data).digest('hex');
            var dstKey = 'thumbnails/' + digest;

            s3.putObject({
                    Bucket: dstBucket,
                    Key: dstKey,
                    Body: data,
                    ContentType: contentType,
                    Metadata: {
                        originalFileDigest: originalFileDigest
                    }
                },
                next);
        }
    ], function(err) {
        if (err) {
            var msg = 'Unable to resize ' + srcBucket + '/' + srcKey
        } else {
            var msg = 'Successfully resized ' + srcBucket + '/' + srcKey
        }

        context.done(err, msg);
    });
};