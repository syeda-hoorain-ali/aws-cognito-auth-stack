import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export class EnvSecretsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define the secret as key-value JSON
    const envSecret = new secretsmanager.Secret(this, 'EnvSecretsStack', {
      secretName: 'refine-env-vars', // this is the ID you'll use in SecretsManager and buildspec
      description: 'Environment variables for Refine Next.js app',
      
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          NEXT_PUBLIC_SANITY_PROJECT_ID: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
          NEXT_PUBLIC_SANITY_DATASET: process.env.NEXT_PUBLIC_SANITY_DATASET,
          NEXT_PUBLIC_STRIPE_KEY: process.env.NEXT_PUBLIC_STRIPE_KEY,
          NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
          NEXT_PUBLIC_AWS_BASE_URL: process.env.NEXT_PUBLIC_AWS_BASE_URL,
          NEXT_PUBLIC_AWS_USER_POOL_CLIENT_ID: process.env.NEXT_PUBLIC_AWS_USER_POOL_CLIENT_ID,
          AWS_USER_POOL_CLIENT_SECRET: process.env.AWS_USER_POOL_CLIENT_SECRET,
          NEXT_PUBLIC_AZURE_CLIENT_ID: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID,
          AZURE_CLIENT_SECRET: process.env.AZURE_CLIENT_SECRET,
          AZURE_TENANT_ID: process.env.AZURE_TENANT_ID,
          CLOUDINARY_URL: process.env.CLOUDINARY_URL,
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
