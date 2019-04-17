
# OAuth 2.0 Bearer JWT Authorizer for AWS API Gateway

This project is a sample Node.js implementation of an AWS Lambda custom authorizer for [AWS API Gateway](https://aws.amazon.com/api-gateway/) that works with a JWT bearer token (`id_token` or `access_token`) issued by an OAuth 2.0 Authorization Server. It can be used to secure access to APIs managed by [AWS API Gateway](https://aws.amazon.com/api-gateway/).

It has been designed to work with Okta but should work with any OAuth 2.0 Authorization Server.

The authorizer uses Okta's [JWT Verifier library](https://github.com/okta/okta-oidc-js/tree/master/packages/jwt-verifier) to retrieve keys (jwks) from your Okta tenant and verify tokens.

## Prerequisites

There are three main components to this setup:

1. An Okta tenant, with an Authorization Server
If you do not already have an Okta tenant with an Authorization Server, you can get a free-forever developer tenant from Okta that has all the capabilities you need for this repo [here](https://developer.okta.com).

2. Amazon API Gateway

3. An AWS Lambda function (this repo) to perform token validation

(You will also need an IAM role for the Lambda function.)

## Lambda authorizer quick setup - overview

The easiest way to get up and running with this authorizer is to create a new Lambda function using the publicly available S3 bucket as your code source, and add your environment variables to the function via the Lambda UI.

This default authorizer enforces scope-based access to API resources using the `scp` claim in the JWT.  The `api:read` scope is required for `GET` requests and `api:write` scope for `POST`, `PUT`, `PATCH`, or `DELETE` requests.

To customize the authorizer, please see "Customizing the authorizer" below.

## Lambda authorizer quick setup - steps

From the [AWS Lambda console](https://console.aws.amazon.com/lambda/home#/create?step=2)

* Author from scratch

* **Function name:** oauth2-jwt-authorizer
* **Runtime:** Node.js 8.10
* **Permissions**: choose or create a role with basic Lambda permissions (if you need help creating a role see below)

click Create function

On the main function screen:

* **Code entry type:** Upload a file from Amazon S3
* **Amazon S3 link URL:** https://s3.us-east-2.amazonaws.com/tom-smith-okta/aws-lambda-authorizer/lambda-oauth2-jwt-authorizer.zip
* **Handler:** index.handler

### Environment variables

Enter the following environment variables on the main function screen:

ISSUER -> from your Okta authorization server

AUDIENCE -> from your Okta authorization server

CLIENT_ID -> a client_id from your Okta tenant

The `audience` value should uniquely identify your AWS API Gateway deployment. You should assign unique audiences for each API Gateway authorizer instance so that a token intended for one gateway is not valid for another.

Click **Save** to create your function.

### Creating an IAM Role for the Lambda function

If you don't already have an IAM role with permissions to create a Lambda function, you will need to create an IAM Role.

That Role will need to have a Policy similar to the following:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Resource": [
                "*"
            ],
            "Action": [
                "lambda:InvokeFunction"
            ]
        }
    ]
}
```

## Add the Lambda Authorizer to API Gateway

From the [AWS API Gateway console](https://console.aws.amazon.com/apigateway/home)

Open your API, or Create a new one.

In the left panel, under your API name, click on **Authorizers**. Click on **Create New Authorizer**

* **Name:** oauth2-jwt-authorizer
* **Type:** Lambda
* **Lambda function:** choose your new Lambda function
* **Lambda Invoke Role:** the ARN of the Role we created in the previous step
* **Lambda Event Payload:** Token
* **Token source:** Authorization
* **Token validation expression:** `^Bearer [-0-9a-zA-z\.]*$`

  > Copy-and-paste this regular expression from ^ to $ inclusive

Click **Create**

### Testing

You can test the authorizer by supplying an `id_token` or `access_token` and clicking **Test**

    Bearer <token>

A successful test will look something like:

    Latency: 1000 ms
    Principal Id: user@example.com
    Policy
    {
        "Version": "2012-10-17",
        "Statement": [
            {
            "Sid": "Stmt1459758003000",
            "Effect": "Allow",
            "Action": [
                "execute-api:Invoke"
            ],
            "Resource": [
                "arn:aws:execute-api:*"
            ]
            }
        ]
    }

## Configure API Gateway Methods to use the Authorizer

In the left panel, under your API name, click on **Resources**.
Under the Resource tree, select one of your Methods (POST, GET etc.)

Select **Method Request**. Under **Settings** change:

* Authorization: oauth2-jwt-authorizer

Note: if you don't see your new Lambda function in the drop-down, refresh the page.

Make sure that:

* API Key Required : false

Click the tick to save the changes.

### Deploy the API

You need to Deploy the API to make the changes public.

Select **Actions** and **Deploy API**. Select your **Stage**.

### Test your endpoint remotely

#### With Postman

You can use Postman to test the REST API

* Method: < matching the Method in API Gateway >
* URL `https://<api-id>.execute-api.<region>.amazonaws.com/<stage>/<resource>`
 * The base URL you can see in the Stages section of the API
 * Append the Resource name to get the full URL
* Header - add an Authorization key
 * Authorization : Bearer <token>

#### With curl from the command line

    $ curl -X POST <url> -H 'Authorization: Bearer <token>'

#### In (modern) browsers console with fetch

    fetch( '<url>', { method: 'POST', headers: { Authorization : 'Bearer <token>' }}).then(response => { console.log( response );});

# Customizing the Authorizer

This sample currently enforces scope-based access to API resources using the `scp` claim in the JWT.  The `api:read` scope is required for `GET` requests and `api:write` scope for `POST`, `PUT`, `PATCH`, or `DELETE` requests.

To add your own scopes and policies, update `index.js` with your authorization requirements.

## Manual Deployment

### Install Dependencies

Run `npm install` to download all of the authorizer's dependent modules. This is a prerequisite for deployment as AWS Lambda requires these files to be included in the uploaded bundle.

### Create Bundle

You can create the bundle using `npm run zip`. This creates a oauth2-jwt-authorizer.zip deployment package in the `dist` folder with all the source, configuration and node modules AWS Lambda needs.

### Create Lambda function

Follow the instructions above to create the Lambda function. You can either upload the new .zip file directly or upload it to an S3 bucket.
