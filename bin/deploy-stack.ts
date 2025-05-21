#!/usr/bin/env node
import * as path from 'path';
import { config } from 'dotenv';
import * as cdk from 'aws-cdk-lib';
import { DeployStack } from '../lib/deploy-stack';

config({
  path: path.resolve(process.cwd(), '.env.local')
})

const app = new cdk.App();
new DeployStack(app, 'DeployStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});

// {
//     "ARN": "arn:aws:secretsmanager:us-east-1:072248435793:secret:github-token-Cr39CR",
//     "Name": "github-token",
//     "VersionId": "a64bdb56-3c85-42f4-bdf2-8b7ab51c1c99"
// }

let a = {
  "ARN": "arn:aws:secretsmanager:us-east-1:0123456789:secret:github-token-Abcd123",
  "Name": "github-token",
  "VersionId": "abcd12345-67890"
}