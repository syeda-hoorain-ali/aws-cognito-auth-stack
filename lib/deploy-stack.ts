import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as eb from 'aws-cdk-lib/aws-elasticbeanstalk';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cpactions from 'aws-cdk-lib/aws-codepipeline-actions';

function getSecretValue(name: string): cdk.SecretValue {
  return cdk.SecretValue.secretsManager('env-vars', { jsonField: name })
}

export class DeployStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    // Elastic Beanstalk application
    const ebApp = new eb.CfnApplication(this, 'Refine', {
      applicationName: 'Refine',
      description: 'An e-commerce app using AWS Cognito for authentication with Google and Microsoft providers.',
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
      instanceProfileName: 'RefineProfile',
    });

    const ebEnv = new eb.CfnEnvironment(this, 'RefineEnv', {
      environmentName: 'RefineEnv',
      applicationName: ebApp.applicationName!,
      solutionStackName: '64bit Amazon Linux 2023 v6.5.1 running Node.js 20',
      optionSettings: [
        {
          namespace: 'aws:autoscaling:launchconfiguration',
          optionName: 'IamInstanceProfile',
          value: ebInstanceProfile.instanceProfileName,
        },
      ],
    });

    // Import the secret by name
    const envSecret = secretsmanager.Secret.fromSecretNameV2(this, 'ImportedEnvSecret', 'env-vars');

    // CodeBuild project
    const buildProject = new codebuild.PipelineProject(this, 'RefineBuild', {
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
      owner: 'syeda-hoorain-ali', // ← your GitHub username
      repo: 'refine',
      oauthToken: cdk.SecretValue.unsafePlainText(process.env.GITHUB_PAT_TOKEN!),
      output: sourceOutput,
      branch: 'main',
    });

    // CodePipeline
    new codepipeline.Pipeline(this, 'RefinePipeline', {
      pipelineName: 'RefinePipeline',
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


    // Wanted this url in output
    // http://refineenv.eba-frmd2hcf.us-east-1.elasticbeanstalk.com/

    // 📦 Output values
    new cdk.CfnOutput(this, 'attrEndpointUrl', {
      value: ebEnv.attrEndpointUrl,
    })
  }
}
