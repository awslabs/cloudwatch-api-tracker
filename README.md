API Tracker
===============================

This lambda function will publish CloudWatch metrics based on aggregating individual API usage.

VERSION: 0.1.0

AUTHORS: Joe Hsieh, Ho Ming Li, Jeremy Wallace

LICENSE: MIT

Design
===============================

It listens to a CloudWatch Log Stream that is associated with CloudTrail and publishes metrics in specified batches.

![API Tracker Design](http://imgur.com/UWroD4H)

Installation
===============================

Please follow the instructions below to configure API tracker.

1. Create an AWS account and sign in to the *AWS Management Console*.
2. Under Management Tools, click on **CloudTrail**.
3. Click **Trails** on the left menu bar.
4. Click the blue **Add New Trail** button.
5. Name the trail and pick an *S3* bucket location to store the logs. Press create.
6. Once created, click on your newly created *CloudTrail*.
7. In the section *CloudWatch Logs*, press the **pencil Edit icon**.
8. If you do not have a *CloudWatch Log Stream* created, name one here and press continue.
9. Review the *IAM* policy and press Allow.
10. Click back to the main console page and open up the *Lambda* Console page.
11. Locally on your machine, run **npm install** in this directory (api-tracker).
12. Create a new zip file based on the contents of this directory (api-tracker).
13. Create a new lambda function, uploading the zip directory.
14. Click on **Event Sources** in the *Lambda* console. Add a new **event source**.
15. Select **CloudWatch Logs** as the event source and select your created log stream from above.

Congratulations! You have set up API tracker.
