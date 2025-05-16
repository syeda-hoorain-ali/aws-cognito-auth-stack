#!/usr/bin/env node
import * as path from 'path';
import { config } from 'dotenv';
import * as cdk from 'aws-cdk-lib';
import { AuthStack } from '../lib/auth-stack';

config({
  path: path.resolve(process.cwd(), '.env.local')
})

const app = new cdk.App();
new AuthStack(app, 'AuthStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
