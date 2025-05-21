import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm'; // For environment variables

interface AnotherStackProps extends cdk.StackProps {
  // Define any specific properties needed for the stack
}

export class AnotherStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: AnotherStackProps) {
    super(scope, id, props);

    // 1. Create a new VPC (or use an existing one)
    // For simplicity, we'll create a new default VPC.
    // In a production environment, you might want a more controlled VPC.
    const vpc = new ec2.Vpc(this, 'RefineVPC', {
      maxAzs: 2, // Deploy to 2 Availability Zones
      natGateways: 1, // One NAT Gateway for outbound internet access
    });

    // 2. Create a Security Group for the EC2 instance
    // This security group will allow SSH, HTTP, and HTTPS traffic.
    const webSecurityGroup = new ec2.SecurityGroup(this, 'WebSG', {
      vpc,
      description: 'Allow SSH, HTTP, and HTTPS access to Next.js EC2 instance',
      allowAllOutbound: true, // Allow all outbound traffic
    });

    // Allow SSH access from anywhere (for initial setup/debugging)
    // In a production environment, restrict this to known IPs.
    webSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'Allow SSH access'
    );

    // Allow HTTP access from anywhere (for Next.js application)
    webSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP access'
    );

    // Allow HTTPS access from anywhere (if you plan to use SSL/TLS)
    webSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS access'
    );

    // 3. Create an IAM Role for the EC2 instance
    // This role grants the EC2 instance permissions to interact with other AWS services,
    // specifically to retrieve environment variables from SSM Parameter Store.
    const ec2Role = new iam.Role(this, 'RefineInstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: 'IAM role for Next.js EC2 instance',
    });

    // Grant read permissions to SSM Parameter Store for specific parameters
    // Replace 'your-nextjs-app-env-prefix' with a unique prefix for your app's environment variables.
    // Example: /nextjs-app/production/DB_HOST, /nextjs-app/production/API_KEY
    ec2Role.addToPolicy(new iam.PolicyStatement({
      actions: ['ssm:GetParameter', 'ssm:GetParameters', 'ssm:GetParametersByPath'],
      resources: [`arn:aws:ssm:${this.region}:${this.account}:parameter/your-nextjs-app-env-prefix/*`],
    }));

    // 4. Define the EC2 instance
    // We'll use an Amazon Linux 2 AMI, which is a good base for Node.js applications.
    const ami = new ec2.AmazonLinuxImage({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      cpuType: ec2.AmazonLinuxCpuType.X86_64,
    });

    // User data script to install Node.js, npm, pm2, and set up the Next.js app directory.
    // This script runs when the EC2 instance is first launched.
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      '#!/bin/bash',
      'yum update -y',
      // Install Node.js using nvm (Node Version Manager)
      'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash',
      '. ~/.nvm/nvm.sh',
      'nvm install 20', // Install Node.js version 18 (or your preferred version)
      'nvm use 20',
      'npm install -g pm2', // Install PM2 globally for process management

      // Create a directory for the Next.js application
      'mkdir -p /home/ec2-user/nextjs-app',
      'chown -R ec2-user:ec2-user /home/ec2-user/nextjs-app',
      'echo "Next.js application setup complete."',
      // Note: The actual Next.js app deployment will be handled by GitHub Actions.
      // This user data just prepares the environment.
    );

    const instance = new ec2.Instance(this, 'RefineAppInstance', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO), // T3.micro is usually free tier eligible
      machineImage: ami,
      securityGroup: webSecurityGroup,
      role: ec2Role, // Attach the IAM role
      userData: userData, // Run the user data script
      keyName: 'hoorain-refine-key', // IMPORTANT: Replace with your EC2 Key Pair name
    });

    // 5. Output the public IP address of the EC2 instance
    new cdk.CfnOutput(this, 'NextJsAppPublicIp', {
      value: instance.instancePublicIp,
      description: 'The public IP address of the Next.js EC2 instance',
    });

    new cdk.CfnOutput(this, 'NextJsAppPublicDns', {
      value: instance.instancePublicDnsName,
      description: 'The public DNS name of the Next.js EC2 instance',
    });

    new cdk.CfnOutput(this, 'SSHCommand', {
      value: `ssh -i ~/.ssh/hoorain-refine-key.pem ec2-user@${instance.instancePublicIp}`,
      description: 'SSH command to connect to the EC2 instance',
    });

    // 6. Create an SSM Parameter for the application's base path for environment variables
    // This parameter will be used by the GitHub Action to know where to fetch env vars from.
    new ssm.StringParameter(this, 'RefineEnvPath', {
      parameterName: '/nextjs-app/env-path-prefix',
      stringValue: '/nextjs-app/production', // This is the base path for your environment variables
      description: 'Base path for Next.js application environment variables in SSM Parameter Store',
    });
  }
}
