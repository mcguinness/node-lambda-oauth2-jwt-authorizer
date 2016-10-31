require('dotenv').config();

const JwtTokenHandler = require('node-oauth2-bearer-jwt-handler').JwtTokenHandler;
const AuthPolicy = require('./auth-policy');
const fs = require('fs');
const jwtTokenHandler = new JwtTokenHandler({
  issuer: process.env.ISSUER,
  audience: process.env.AUDIENCE,
  jwks: fs.readFileSync('keys.json', 'utf8'),
});

exports.handler = function(event, context) {
  jwtTokenHandler.verifyRequest({
    headers: {
      authorization: event.authorizationToken
    }
  }, function(err, claims) {
    if (err) {
      console.log('Failed to validate bearer token', err);
      context.fail('Unauthorized');
    }

    console.log('request principal: ' + claims);

    var apiOptions = {};
    const arnParts = event.methodArn.split(':');
    const apiGatewayArnPart = arnParts[5].split('/');
    const awsAccountId = arnParts[4];
    apiOptions.region = arnParts[3];
    apiOptions.restApiId = apiGatewayArnPart[0];
    apiOptions.stage = apiGatewayArnPart[1];
    const method = apiGatewayArnPart[2];
    const resource = '/'; // root resource

    if (apiGatewayArnPart[3]) {
      resource += apiGatewayArnPart[3];
    }

    const policy = new AuthPolicy(claims.sub, awsAccountId, apiOptions);
    policy.allowAllMethods();

    return context.succeed(policy.build());
  });
}
