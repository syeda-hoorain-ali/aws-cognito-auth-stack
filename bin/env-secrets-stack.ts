#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { EnvSecretsStack } from '../lib/env-secrets-stack';

const app = new cdk.App();
new EnvSecretsStack(app, 'EnvSecretsStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
