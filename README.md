
# OAuth 2.0 Bearer JWT Authorizer for AWS API Gateway

The oauth2-jwt-bearer-authorizer is sample implementation of a custom authorizer for AWS API Gateway that works with a JWT `id_token` or `access_token` issued by an OAuth 2.0 Authorization Server.  It can be used to secure access to API managed by AWS API Gateway.

## Configuration

### Packages

Run `npm install` to download all the dependent modules. This is a prerequisite for deployment as AWS Lambda requires these files to be included in the bundle.

### .env

Specifies the required JWT validation parameters for the API Gateway custom authorizer

```
ISSUER=https://example.oktapreview.com/oauth2/aus8o56xh1qncrlwT0h7
AUDIENCE=https://api.example.com
```

You can obtain these values from your Authorization Server configuration

### keys.json

Specifies the RSA signature keys in JSON Web Key Set (JWKS) format used to validate tokens from the issuer

You can obtain the JWKS for your token issuer by fetching the `jwks_uri` published in your provider metadata `{{issuer}}/.well-known/openid-configuration`.

> Please ensure that your issuer uses a pinned key for token signatures (`MANUAL`) and does not automatically rotate signing keys.  The authorizer currently doesn't not support persistence of cached keys (e.g. dynamo).

# Deployment

### Create bundle

You can create the bundle using `npm zip`. This creates a oauth2-jwt-bearer-authorizer.zip deployment package with all the source, configuration and node modules AWS Lambda needs.

### Create Lambda function

From the AWS console https://console.aws.amazon.com/lambda/home#/create?step=2

* Name : oauth2-jwt-bearer-authorizer
* Description: OAuth2 Bearer JWT authorizer for API Gateway
* Runtime: Node.js 4.3
* Code entry type: Upload a .ZIP file
* Upload : < select lambda-oauth2-jwt-bearer-authorizer.zip we created in the previous step >
* Handler : index.handler
* Role :  Basic
* Memory (MB) : 128
* Timeout : 30 seconds
* VPC : No VPC

Click Next and Create

### Configure API Gateway

From the AWS console https://console.aws.amazon.com/apigateway/home

Open your API, or Create a new one.

In the left panel, under your API name, click on **Custom Authorizers**. Click on **Create**

* Name : oauth2-jwt-bearer-authorizer
* Lambda region : < from previous step >
* Execution role : < the ARN of the Role we created in the previous step >
* Identity token source : method.request.header.Authorization
* Token validation expression : ```^Bearer [-0-9a-zA-z\.]*$```
** Cut-and-paste this regular expression from ^ to $ inclusive
* Result TTL in seconds : 3600

Click **Create**

### Testing

You can test the authorizer by supplying an id_token or access_token and clicking **Test**

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

### Configure API Gateway Methods to use the Authorizer

In the left panel, under your API name, click on **Resources**.
Under the Resource tree, select one of your Methods (POST, GET etc.)

Select **Method Request**. Under **Authorization Settings** change:

* Authorizer : oauth2-jwt-bearer-authorizer

Make sure that:

* API Key Required : false

Click the tick to save the changes.

### Deploy the API

You need to Deploy the API to make the changes public.

Select **Action** and **Deploy API**. Select your **Stage**.

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
