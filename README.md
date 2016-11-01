
# OAuth 2.0 Bearer JWT Authorizer for AWS API Gateway

This project is sample implementation of an AWS Lambda custom authorizer for [AWS API Gateway](https://aws.amazon.com/api-gateway/) that works with a JWT bearer token (`id_token` or `access_token`) issued by an OAuth 2.0 Authorization Server.  It can be used to secure access to APIs managed by [AWS API Gateway](https://aws.amazon.com/api-gateway/).

## Configuration

### Environment Variables (.env)

Update the `ISSUER` and `AUDIENCE` variables in the `.env` file

```
ISSUER=https://example.oktapreview.com/oauth2/aus8o56xh1qncrlwT0h7
AUDIENCE=https://api.example.com
```

It is critical that the `issuer` and `audience` claims for JWT bearer tokens are [properly validated using best practices](http://www.cloudidentity.com/blog/2014/03/03/principles-of-token-validation/).  You can obtain these values from your OAuth 2.0 Authorization Server configuration.

The `audience` value should uniquely identify your AWS API Gateway deployment.  You should assign unique audiences for each API Gateway authorizer instance so that a token intended for one gateway is not valid for another.

### Signature Keys (keys.json)

Update `keys.json` with the JSON Web Key Set (JWKS) format for your issuer.   You can usually obtain the JWKS for your issuer by fetching the `jwks_uri` published in your issuer's metadata such as `${issuer}/.well-known/openid-configuration`.

> The authorizer only supports RSA signature keys

> Ensure that your issuer uses a pinned key for token signatures and does not automatically rotate signing keys.  The authorizer currently does not support persistence of cached keys (e.g. dynamo) obtained via metadata discovery.

### Scopes

This sample currently enforces scope-based access to API resources using the `scp` claim in the JWT.  The `api:read` scope is required for `GET` requests and `api:write` scope for `POST`, `PUT`, `PATCH`, or `DELETE` requests.

Update `index.js` with your authorization requirements and return the resulting AWS IAM Policy for the request.

# Deployment

### Install Dependencies

Run `npm install` to download all of the authorizer's dependent modules. This is a prerequisite for deployment as AWS Lambda requires these files to be included in the uploaded bundle.

### Create Bundle

You can create the bundle using `npm run zip`. This creates a oauth2-jwt-authorizer.zip deployment package in the `dist` folder with all the source, configuration and node modules AWS Lambda needs.

### Create Lambda function

From the [AWS Lambda console](https://console.aws.amazon.com/lambda/home#/create?step=2)

* **Name:** oauth2-jwt-authorizer
* **Description:** OAuth2 Bearer JWT authorizer for API Gateway
* **Runtime:** Node.js 4.3
* **Code entry type:** Upload a .ZIP file
* **Upload:** *select `dist\lambda-oauth2-jwt-authorizer.zip` we created in the previous step*
* **Handler:** index.handler
* **Role:**  *select an existing role with `lambda:InvokeFunction` action*

  > If you don't have an existing role, you will need to create a new role as outlined below

* **Memory (MB):** 128
* **Timeout:** 30 seconds
* **VPC:** No VPC

Click **Next** and **Create**

### Create IAM Role

You will need to create an IAM Role that has permissions to invoke the Lambda function we created above.

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

### Configure API Gateway

From the [AWS API Gateway console](https://console.aws.amazon.com/apigateway/home)

Open your API, or Create a new one.

In the left panel, under your API name, click on **Custom Authorizers**. Click on **Create**

* **Name:** oauth2-jwt-authorizer
* **Lambda region:** *from previous step*
* **Execution role:** *the ARN of the Role we created in the previous step*
* **Identity token source:** `method.request.header.Authorization`
* **Token validation expression:** `^Bearer [-0-9a-zA-z\.]*$`

  > Cut-and-paste this regular expression from ^ to $ inclusive

* **Result TTL in seconds:** 300

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

### Configure API Gateway Methods to use the Authorizer

In the left panel, under your API name, click on **Resources**.
Under the Resource tree, select one of your Methods (POST, GET etc.)

Select **Method Request**. Under **Authorization Settings** change:

* Authorizer : oauth2-jwt-authorizer

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
