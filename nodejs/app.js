/**
 * API tracker
 * This lambda function will publish CloudWatch metrics based on API usage.
 * It listens to a CloudWatch Log Stream that is associated with a CloudTrail log,
 * and publishes metrics in specified batches.
 * VERSION: 0.1.0
 * AUTHORS: Joe Hsieh, Ho Ming Li, Jeremy Wallace, Feng Zhou
 * LICENSE: MIT
 **/

var AWS = require('aws-sdk');
var cloudwatch = new AWS.CloudWatch();
var zlib = require('zlib');
var BATCH = 20;
var JITTER_MS = 3000;
var NAMESPACE = "API-COUNT";

exports.handler = function(input, context, callback) {

    // API metrics array.
    var apiMetrics = {};

    // decode input from base64
    var zippedInput = new Buffer(input.awslogs.data, 'base64');

    // decompress the input
    zlib.gunzip(zippedInput, function(error, buffer) {

        if (error) {
            callback(err);
        }

        // Parse JSON from input.

        var awslogsData = JSON.parse(buffer.toString('utf8'));

        if (awslogsData.messageType === 'CONTROL_MESSAGE') {
            callback(null, "Successfully posted control message!");
            return null;
        }

        // Populate metrics params array from log events.

        console.log(awslogsData.logEvents.length + " events captured.");

        awslogsData.logEvents.forEach(function(logEvent, index, logEventsArr) {

          var event = JSON.parse(logEvent.message);

          var hash = event.region+":"+event.eventName+":"+event.eventSource+":"+event.eventTime;

          if (apiMetrics[hash]) {
            apiMetrics[hash].Value++;
          } else {
            apiMetrics[hash] = {
              MetricName: event.eventName,
              Dimensions: [{
                  Name: 'awsRegion',
                  Value: event.awsRegion
              },{
                  Name: 'eventSource',
                  Value: event.eventSource
              }],
              Timestamp: event.eventTime,
              Unit: 'Count',
              Value: 1
            };
          }

        });

        var apiMetricParams = [];
        var promiseList = [];
        
        // Submit every 20 metric
        
        for (var hash in apiMetrics) {
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
    var promise = new Promise(function(resolve, reject) {
        var params = {
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
    return promise;
}