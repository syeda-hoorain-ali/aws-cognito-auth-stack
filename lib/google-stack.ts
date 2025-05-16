import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { Role, FederatedPrincipal, ManagedPolicy } from "aws-cdk-lib/aws-iam";
import { AccountRecovery, CfnIdentityPool, CfnIdentityPoolRoleAttachment, UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito'
import { config } from "dotenv"
import * as path from 'path';

config({
    path: path.resolve(process.cwd(), '.env.local')
})



// const googleClientId = "507611942992-r31k04ort8j736usf4u69iars4fd550p.apps.googleusercontent.com"
const googleClientId = process.env.GOOGLE_CLIENT_ID!



// import * as sst from "@serverless-stack/resources";

export class GoogleStack extends cdk.Stack {
    // export default class CognitoStack extends sst.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const userPool = new UserPool(this, 'HoorainUserPool', {
            userPoolName: 'HoorainUserPool',
            selfSignUpEnabled: true,
            signInAliases: { email: true },
            autoVerify: { email: true },
            standardAttributes: {
                email: {
                    required: true,
                    mutable: false
                }
            },
            passwordPolicy: {
                minLength: 8,
                requireSymbols: true,
                requireDigits: true,
                requireLowercase: true,
                requireUppercase: true
            },
            accountRecovery: AccountRecovery.EMAIL_ONLY
        })

        // 👤 User Pool Client
        const userPoolClient = new UserPoolClient(this, 'HoorainUserPoolClient', {
            userPool,
            userPoolClientName: 'HoorainUserPoolClient',
            generateSecret: false,
            authFlows: {
                userPassword: true,
                userSrp: true,
            },
            oAuth: {
                flows: { authorizationCodeGrant: true },
                callbackUrls: ['http://localhost:3000/api/auth/callback/google'],
                logoutUrls: ['http://localhost:3000/'],
            }
        })
        
        const identityPool = new CfnIdentityPool(this, "HoorainIdentityPool", {
            identityPoolName: "HoorainIdentityPool",
            allowUnauthenticatedIdentities: false, // Don't allow unathenticated users
            supportedLoginProviders: {
                "accounts.google.com": googleClientId,
            },
            cognitoIdentityProviders: [
                {
                    clientId: userPoolClient.userPoolClientId,
                    providerName: userPool.userPoolProviderName,
                },
                // {
                //     clientId: googleClientId,
                //     providerName: "accounts.google.com", // for Google
                // },
            ],
        });




        // Authenticated role
        const authenticatedRole = new Role(this, "CognitoDefaultAuthenticatedRole", {
            assumedBy: new FederatedPrincipal(
                'cognito-identity.amazonaws.com',
                {
                    StringEquals: {
                        'cognito-identity.amazonaws.com:aud': identityPool.ref,
                    },
                    'ForAnyValue:StringLike': {
                        'cognito-identity.amazonaws.com:amr': 'authenticated',
                    },
                },
                'sts:AssumeRoleWithWebIdentity'
            ),
            managedPolicies: [
                ManagedPolicy.fromAwsManagedPolicyName('AmazonCognitoPowerUser'),
            ],
        });



        // Attach to identity pool
        new CfnIdentityPoolRoleAttachment(this, 'DefaultRoleAttachment', {
            identityPoolId: identityPool.ref,
            roles: {
                authenticated: authenticatedRole.roleArn,
            },
        });
        // identityPool.addOverride("Properties.Roles", {
        //     authenticated: authenticatedRole.roleArn,
        // });


        // Export values
        new cdk.CfnOutput(this, "UserPoolId", {
            value: userPool.userPoolId,
        });
        new cdk.CfnOutput(this, "UserPoolClientId", {
            value: userPoolClient.userPoolClientId,
        });
        new cdk.CfnOutput(this, "IdentityPoolId", {
            value: identityPool.ref,
        });
        new cdk.CfnOutput(this, "AuthenticatedRoleArn", {
            value: authenticatedRole.roleArn,
        });
    }
}




// You’ll need to set up your Google Client ID in the Cognito Console or automate via CfnUserPoolIdentityProvider.

