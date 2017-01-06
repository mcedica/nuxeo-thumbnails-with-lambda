'use strict';

console.log('Loading function');

const aws = require('aws-sdk');
const util = require('util');
const http = require('http');
const s3 = new aws.S3({
    apiVersion: '2006-03-01'
});

var updateThumbnails = function(originalFileDigest, thumbnailDigest) {
    var options = {
        host: 'http://test.nuxeodev.io',
        method: 'POST',
        path: '/nuxeo/site/automation/Document.SetThumbnail',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json+nxrequest'
        },
        //this will be env variables encrypted using KMS
        auth: 'Administrator:Administrator'
    };

    var postData = JSON.stringify({
        'params': {
            'originalFileDigest': originalFileDigest,
            'thumbnailDigest': thumbnailDigest
        }
    });

    var req = http.request(options, function(res) {
        res.on('data', function(response) {
            context.succeed('succeed');
        });

        res.on('end', function(response) {
            context.succeed('end');
        });

    });
    req.write(postData);
    req.end();
}




exports.handler = (event, context, callback) => {
    var srcBucket = event.Records[0].s3.bucket.name;
    // Object key may have spaces or unicode non-ASCII characters.
    var srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
    var dstBucket = srcBucket;
    var thumbnailDigest = srcKey.substring('thumbnails'.length + 1, srcKey.length);
    var newKey = 'nuxeo/' + thumbnailDigest;

    //Copy - Pasting the object won't trigger a 'putObject' event
    s3.copyObject({
        Bucket: dstBucket,
        Key: newKey,
        CopySource: srcBucket + '/' + srcKey
    }, (err, data) => {
        if (err) {
            console.log('Error copying file:' + err);
        } else {
            //get the object to read the original file digest stored in metadata
            s3.getObject({
                Bucket: dstBucket,
                Key: newKey
            }, function(err, data) {
                if (err) console.log(err, err.stack);
                else
                    updateThumbnails(data.Metadata['originalfiledigest'], thumbnailDigest);
            });
        }
    });
};