'use strict';

/**
 * Cloudwatch API Tracker
 *
 * This lambda function will publish CloudWatch metrics based on API usage.
 * It listens to a CloudWatch Log Stream that is associated with a CloudTrail log,
 * and publishes metrics in specified batches.
 *
 * Authors: Joe Hsieh, Ho Ming Li, Jeremy Wallace

     Copyright 2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.

     Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

         http://aws.amazon.com/apache2.0/

     or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

     Note: Other license terms may apply to certain, identified software files contained within or
     distributed with the accompanying software if such terms are included in the directory containing
     the accompanying software. Such other license terms will then apply in lieu of the terms of the
     software license above.

 **/

const AWS = require('aws-sdk');
const cloudwatch = new AWS.CloudWatch();
const zlib = require('zlib');

const NAMESPACE = "API-COUNT";
const JITTER_MS = 3000; // spread "PutMetricData" calls to avoid throttling at scale
const BATCH = 20; // batch size for "PutMetricData" call

exports.handler = function(input, context, callback) {

    // API metrics array.
    let apiMetrics = {};

    // decode input from base64
    const zippedInput = new Buffer(input.awslogs.data, 'base64');

    // decompress the input
    zlib.gunzip(zippedInput, function(err, buffer) {

        if (err) { callback(err); }

        // Parse JSON from input.

        const awslogsData = JSON.parse(buffer.toString('utf8'));

        if (awslogsData.messageType === 'CONTROL_MESSAGE') {
            callback(null, "Successfully posted control message!");
        }

        // Populate metrics params array from log events.

        console.log(awslogsData.logEvents.length + " events captured.");

        awslogsData.logEvents.forEach(function(logEvent, index, logEventsArr) {

          const event = JSON.parse(logEvent.message);

          const hash = [event.eventTime, event.eventName, event.awsRegion, event.eventSource];

          // Filling any undefined values to prevent errors on "PutMetricData" call.

          for (index in hash) {
            if (! hash[index]) {hash[index] = '-'}
          }

          if (apiMetrics[hash]) {
            apiMetrics[hash].Value++;
          } else {
            apiMetrics[hash] = {
              Timestamp: hash[0],
              MetricName: hash[1],
              Dimensions: [{
                Name: 'awsRegion',
                Value: hash[2]
              },{
                Name: 'eventSource',
                Value: hash[3]
              }],
              Value: 1
            };
          }

        });

        let apiMetricParams = [];
        let promiseList = [];

        // Submit every 20 metric (BATCH size)

        for (const hash in apiMetrics) {
          apiMetricParams.push(apiMetrics[hash]);
          if (apiMetricParams.length==BATCH) {
            promiseList.push(postToCloudWatch(apiMetricParams));
            apiMetricParams = [];
          }
        }

        // Submit final set of metric

        if (apiMetricParams.length > 0 ) promiseList.push(postToCloudWatch(apiMetricParams));

        // Ensure all data posted before callback

        Promise.all(promiseList).then(function(val) {
            console.log("Successfully posted " + val + " events!");
            callback(null, "Successfully posted " + val + " events!");
        }).catch(function(err) {
            console.log('A promise failed to resolve', err);
            callback(err);
        });
    });
};

/**
 * This function invokes "PutMetricData" and publishes an array of data
 * to CloudWatch.
 **/
function postToCloudWatch(chunkedDataArray) {
    return new Promise(function(resolve, reject) {
        const params = {
            MetricData: chunkedDataArray,
            Namespace: NAMESPACE
        };

        setTimeout(function() { cloudwatch.putMetricData(params, function(err, data) {
            if (err) {
                console.log(err, err.stack);
                reject(err);
            } else {
                console.log(JSON.stringify(data));
                resolve(chunkedDataArray.length);
            }
        })} , Math.floor(Math.random() * JITTER_MS));
    });
}
