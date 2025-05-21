import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as elasticbeanstalk from 'aws-cdk-lib/aws-elasticbeanstalk';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class ElasticBeanstalkStack extends cdk.Stack {
  public readonly ebAppName: string;
  public readonly ebEnvName: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const appName = 'refine-app';
    const envName = 'refine-env';
    this.ebAppName = appName;
    this.ebEnvName = envName;

    const ebApp = new elasticbeanstalk.CfnApplication(this, 'RefineApplication', {
      applicationName: appName,
    });

    const ebRole = new iam.Role(this, 'RefineEBInstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMReadOnlyAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWebTier'),
      ],
    });

    const instanceProfile = new iam.CfnInstanceProfile(this, 'RefineInstanceProfile', {
      roles: [ebRole.roleName],
    });

    new elasticbeanstalk.CfnEnvironment(this, 'RefineEnvironment', {
      environmentName: envName,
      applicationName: appName,
      solutionStackName: '64bit Amazon Linux 2023 v6.5.1 running Node.js 20',
      optionSettings: [
        {
          namespace: 'aws:autoscaling:launchconfiguration',
          optionName: 'IamInstanceProfile',
          value: instanceProfile.ref,
        },
        {
          namespace: 'aws:elasticbeanstalk:application:environment',
          optionName: 'NODE_ENV',
          value: 'production',
        },
      ],
    });

  }
}
