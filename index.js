/******************************************************/
// Okta lambda authorizer for Amazon API Gateway

require('dotenv').config();

const OktaJwtVerifier = require('@okta/jwt-verifier');

/******************************************************/

const oktaJwtVerifier = new OktaJwtVerifier({
  issuer: process.env.ISSUER, // required
  clientId: process.env.CLIENT_ID, // required
  assertClaims: {
    aud: process.env.AUDIENCE
  }
});

const AuthPolicy = require('./auth-policy');

/******************************************************/

exports.handler = function(event, context) {

  var arr = event.authorizationToken.split(" ");

  var access_token = arr[1];

  oktaJwtVerifier.verifyAccessToken(access_token)
  .then(jwt => {
    // the token is valid (per definition of 'valid' above)
    console.log(jwt.claims);

    var claims = jwt.claims;

    console.log('request principal: ' + claims);

    var apiOptions = {};
    const arnParts = event.methodArn.split(':');
    const apiGatewayArnPart = arnParts[5].split('/');
    const awsAccountId = arnParts[4];
    apiOptions.region = arnParts[3];
    apiOptions.restApiId = apiGatewayArnPart[0];
    apiOptions.stage = apiGatewayArnPart[1];
    const method = apiGatewayArnPart[2];
    var resource = '/'; // root resource

    if (apiGatewayArnPart[3]) {
      resource += apiGatewayArnPart[3];
    }

    var policy = new AuthPolicy(claims.sub, awsAccountId, apiOptions);

    /*
      example scope based authorization

      to allow full access:
        policy.allowAllMethods()
    */

    if (claims.scp.includes('api:read')) {
      policy.allowMethod(AuthPolicy.HttpVerb.GET, "*");
    }
    else if (claims.scp.includes('api:write')) {
      policy.allowMethod(AuthPolicy.HttpVerb.POST, "*");
      policy.allowMethod(AuthPolicy.HttpVerb.PUT, "*");
      policy.allowMethod(AuthPolicy.HttpVerb.PATCH, "*");
      policy.allowMethod(AuthPolicy.HttpVerb.DELETE, "*");
    }

    policy.allowMethod(AuthPolicy.HttpVerb.HEAD, "*");
    policy.allowMethod(AuthPolicy.HttpVerb.OPTIONS, "*");

    return context.succeed(policy.build());
  })
  .catch(err => {

    console.log(err)
    return context.fail('Unauthorized');
  });
}
