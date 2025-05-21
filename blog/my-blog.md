# 🚀 Deploy a Next.js App to AWS using CDK (Step-by-Step for Beginners)

> This guide is made for **beginners who have never used AWS CDK or deployed apps to AWS** before. By the end, your app will be live on an EC2 instance, just like Vercel, but fully under your control!

---

## ✨ What You'll Learn

* How to create an AWS account
* How to install and use AWS CDK (Cloud Development Kit)
* How to deploy a Next.js app to AWS EC2 with a custom domain

---

## ✉️ Step 1: Create an AWS Account

1. Go to [https://aws.amazon.com](https://aws.amazon.com)
2. Click **“Create an AWS Account”**
3. Enter email, password, and billing info (AWS requires a credit/debit card)
4. Choose the **Free Tier** plan
4. Sign in to the **AWS Management Console**

> **Important**: AWS offers 750 hours of free EC2 usage per month in the free tier.

\[// Insert image of AWS signup page here]

---

## 🔑 Step 2: Get Your AWS Access Key ID and Secret Access Key

1. In the AWS Console, search for **IAM** and open the **IAM** dashboard.
2. In the left sidebar, click **Users**.
3. Click your username to open your user details.
4. Go to the **Security credentials** tab.
5. Scroll down to **Access keys** and click **Create access key**.
6. Follow the prompts and download your keys.  
    > **Note:** You will only see the Secret Access Key once—save it securely!

\[// Insert screenshot of IAM > Users > Security Credentials tab]

---

## 🔧 Step 3: Install the Tools You’ll Need

Make sure you have these installed on your computer:

```bash
# Node.js (v18+ recommended)
node -v

# TypeScript compiler
npm install -g typescript

# AWS CDK
npm install -g aws-cdk
```

---

## ⚙️ Step 4: Configure AWS CLI with Your Credentials

```bash
aws configure
```

You'll be prompted to enter:

* AWS Access Key ID
* AWS Secret Access Key
* Region (e.g., `us-east-1`)
* Output format (`json`)

---

## 📦 Step 5: Set Up Your CDK Project

```bash
mkdir cdk-aws-deploy
cd cdk-aws-deploy
cdk init app --language typescript
```

🖼️ *\[Insert screenshot of terminal after `cdk init`]*

Now install the CDK libraries we'll use:

```bash
npm i aws-cdk-lib constructs
npm i --save-dev @types/constructs
```

---

## 📁 Step 6: Create Your Stack Code

### 🗂️ `lib/env-secrets-stack.ts`

```ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export class EnvSecretsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define the secret as key-value JSON
    const envSecret = new secretsmanager.Secret(this, 'EnvSecretsStack', {
      secretName: 'my-env-vars', // this is the ID you'll use in SecretsManager and buildspec
      description: 'Environment variables for Next.js app',
      
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
        // Add your environment variables here, for example:
        API_KEY: "your-api-key",
        API_SECRET: "your-api-secret",
        }),
        generateStringKey: 'unused', // required if generateSecretString is used
      },
    });

    new cdk.CfnOutput(this, 'EnvSecretARN', {
      value: envSecret.secretArn,
      description: 'ARN of the environment variables secret',
    });
  }
}
```

---

### 🗂️ `lib/aws-deploy-stack.ts`

```ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as eb from 'aws-cdk-lib/aws-elasticbeanstalk';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cpactions from 'aws-cdk-lib/aws-codepipeline-actions';

export class AWSDeployStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    // Elastic Beanstalk application
    const ebApp = new eb.CfnApplication(this, 'NextjsApp', {
      applicationName: 'NextApp'
    });

    // Elastic Beanstalk environment
    const ebRole = new iam.Role(this, 'EBRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWebTier'),
      ],
    });

    const ebInstanceProfile = new iam.CfnInstanceProfile(this, 'InstanceProfile', {
      roles: [ebRole.roleName],
      instanceProfileName: 'InstanceProfile',
    });

    const ebEnv = new eb.CfnEnvironment(this, 'NextjsEnv', {
      environmentName: 'NextjsEnv',
      applicationName: ebApp.applicationName!,
      solutionStackName: '64bit Amazon Linux 2023 v6.5.1 running Node.js 18',
      optionSettings: [
        {
          namespace: 'aws:autoscaling:launchconfiguration',
          optionName: 'IamInstanceProfile',
          value: ebInstanceProfile.instanceProfileName,
        },
      ],
    });

    // Import the secret by name
    const envSecret = secretsmanager.Secret.fromSecretNameV2(this, 'ImportedEnvSecret', 'my-env-vars');

    // CodeBuild project
    const buildProject = new codebuild.PipelineProject(this, 'NextjsBuild', {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true,
      },
      buildSpec: codebuild.BuildSpec.fromSourceFilename('buildspec.yml'),
    });

    // Grant CodeBuild permission to read the secret
    envSecret.grantRead(buildProject);

    // Artifacts
    const sourceOutput = new codepipeline.Artifact();
    const buildOutput = new codepipeline.Artifact();

    // GitHub source action
    const sourceAction = new cpactions.GitHubSourceAction({
      actionName: 'GitHub_Source',
      owner: 'your-github-username', // ← your GitHub username
      repo: 'your-github-repo',
      oauthToken: cdk.SecretValue.unsafePlainText(process.env.GITHUB_PAT_TOKEN!),
      output: sourceOutput,
      branch: 'main',
    });

    // CodePipeline
    new codepipeline.Pipeline(this, 'NextjsPipeline', {
      pipelineName: 'NextjsPipeline',
      stages: [
        {
          stageName: 'Source',
          actions: [sourceAction],
        },
        {
          stageName: 'Build',
          actions: [
            new cpactions.CodeBuildAction({
              actionName: 'Build',
              project: buildProject,
              input: sourceOutput,
              outputs: [buildOutput],
            }),
          ],
        },
        {
          stageName: 'Deploy',
          actions: [
            new cpactions.ElasticBeanstalkDeployAction({
              actionName: 'Deploy_to_EB',
              applicationName: ebApp.applicationName!,
              environmentName: ebEnv.environmentName!,
              input: buildOutput,
            }),
          ],
        },
      ],
    });
  }
}
```

---

### 🗂️ `bin/cdk-aws-deploy.ts`

```ts
#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AWSDeployStack } from '../lib/aws-deploy-stack';
import { EnvSecretsStack } from '../lib/env-secrets-stack';

// Initialize CDK app
const app = new cdk.App();

// Deploy the environment variables stack
new EnvSecretsStack(app, 'EnvSecretsStack', {
  env: { region: 'us-east-1' }, // You can change region
});


// Deploy the aws deploy stack
new AWSDeployStack(app, 'AWSDeployStack', {
  env: { region: 'us-east-1' }, // You can change region
});
```

## 🧪 Step 7: Deploy!

```bash
npm run build       # compile TypeScript
cdk bootstrap       # set up environment
cdk deploy --all    # launch your EC2 instance 🎉
```


