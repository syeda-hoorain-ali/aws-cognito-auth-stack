import * as path from 'path';
import { config } from 'dotenv';
import * as cdk from 'aws-cdk-lib';
import { ElasticBeanstalkStack } from '../lib/elasticbeanstalk-stack';
import { PipelineStack } from '../lib/pipeline-stack';
import { EnvSecretsStack } from '../lib/env-secrets-stack';
import { EC2DeployStack } from '../lib/ec2-deploy-stack';
import { AnotherStack } from '../lib/another-stack';

config({
    path: path.resolve(process.cwd(), '.env.local')
})

const app = new cdk.App();

const ebStack = new ElasticBeanstalkStack(app, 'RefineElasticBeanstalkStack');
new PipelineStack(app, 'RefinePipelineStack', {
    ebAppName: ebStack.ebAppName,
    ebEnvName: ebStack.ebEnvName,
});


new AnotherStack(app, 'RefineAnotherStack', {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
})

new EnvSecretsStack(app, 'EnvSecretsStack', {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});

new EC2DeployStack(app, 'EC2DeployStack', {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});
