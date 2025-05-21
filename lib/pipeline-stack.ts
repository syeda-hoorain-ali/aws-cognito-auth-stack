import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';


interface PipelineStackProps extends cdk.StackProps {
  ebAppName: string;
  ebEnvName: string;
}

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const sourceOutput = new codepipeline.Artifact();
    const buildOutput = new codepipeline.Artifact();

    const githubSource = new codepipeline_actions.GitHubSourceAction({
      actionName: 'GitHub_Source',
      owner: 'syeda-hoorain-ali',
      repo: 'refine',
      oauthToken: cdk.SecretValue.unsafePlainText(process.env.GITHUB_PAT_TOKEN!),
      output: sourceOutput,
      branch: 'main',
    });

    const envSecret = secretsmanager.Secret.fromSecretNameV2(this, 'ImportedEnvSecret', 'refine-env-vars');

    const project = new codebuild.PipelineProject(this, 'BuildProject', {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
      },
    });
    envSecret.grantRead(project);

    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Build',
      project,
      input: sourceOutput,
      outputs: [buildOutput],
    });

    const deployAction = new codepipeline_actions.ElasticBeanstalkDeployAction({
      actionName: 'DeployToEB',
      applicationName: props.ebAppName,
      environmentName: props.ebEnvName,
      input: buildOutput,
    });

    new codepipeline.Pipeline(this, 'Pipeline', {
      stages: [
        {
          stageName: 'Source',
          actions: [githubSource],
        },
        {
          stageName: 'Build',
          actions: [buildAction],
          onFailure: {
            retryMode: codepipeline.RetryMode.FAILED_ACTIONS,
            result: codepipeline.Result.RETRY
          }
        },
        {
          stageName: 'Deploy',
          actions: [deployAction],
        },
      ],
    });
  }
}