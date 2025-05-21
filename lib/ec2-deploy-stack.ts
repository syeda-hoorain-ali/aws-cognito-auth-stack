import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

export class EC2DeployStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'RefineVPC', { isDefault: true });

    const securityGroup = new ec2.SecurityGroup(this, 'WebSG', {
      vpc,
      description: 'Allow HTTP and SSH',
      allowAllOutbound: true,
    });
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'SSH access');
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'HTTP access');

    const role = new iam.Role(this, 'RefineInstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2FullAccess')
      ]
    });

    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      '#!/bin/bash',
      'yum update -y',
      'curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -',
      'yum install -y nodejs git',
      'npm install -g pm2',
      'git clone https://github.com/syeda-hoorain-ali/refine.git',
      'cd refine',
      'npm install',
      'npm run build',
      'pm2 start "npm run start"'
    );

    const instance = new ec2.Instance(this, 'RefineAppInstance', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup,
      role,
      userData,
      keyName: 'hoorain-refine-key' // replace with your EC2 key pair name
    });

    const elasticIp = new ec2.CfnEIP(this, 'RefineEIP');

    new ec2.CfnEIPAssociation(this, 'EIPAssociation', {
      eip: elasticIp.ref,
      instanceId: instance.instanceId
    });

    new cdk.CfnOutput(this, 'AppPublicIP', {
      value: elasticIp.ref,
      description: 'Elastic IP of the deployed EC2 instance',
    });
  }
}
