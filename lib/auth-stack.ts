import * as path from 'path';
import { config } from "dotenv";
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  AccountRecovery, ManagedLoginVersion, OidcAttributeRequestMethod,
  ProviderAttribute, UserPool, UserPoolClient, UserPoolClientIdentityProvider,
  UserPoolDomain, UserPoolIdentityProviderGoogle, UserPoolIdentityProviderOidc
} from 'aws-cdk-lib/aws-cognito';


config({
  path: path.resolve(process.cwd(), '.env.local')
})


export class AuthStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // 🔐 User Pool
    const userPool = new UserPool(this, 'HoorainUserPool', {
      userPoolName: 'HoorainUserPool',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: {
          mutable: true,
          required: true,
        },
        profilePicture: {
          mutable: true,
          required: false,
        },
        fullname: {
          mutable: true,
          required: false
        },
        phoneNumber: {
          mutable: true,
          required: false
        }
      },
      passwordPolicy: {
        minLength: 8,
        requireSymbols: true,
        requireDigits: true,
        requireLowercase: true,
        requireUppercase: true
      },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      keepOriginal: {
        email: true
      }
    })


    // 3️⃣ Google IdP
    const googleProvider = new UserPoolIdentityProviderGoogle(this, 'GoogleIdp', {
      userPool,
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecretValue: cdk.SecretValue.unsafePlainText(process.env.GOOGLE_CLIENT_SECRET!),
      scopes: ['openid', 'email', 'profile'],
      attributeMapping: {
        email: ProviderAttribute.GOOGLE_EMAIL,
        fullname: ProviderAttribute.GOOGLE_NAME,
        phoneNumber: ProviderAttribute.GOOGLE_PHONE_NUMBERS,
        profilePicture: ProviderAttribute.GOOGLE_PICTURE
      },
    });

    const mircosoftProvider = new UserPoolIdentityProviderOidc(this, 'MicrosoftIdp', {
      userPool,
      name: 'MicrosoftIdp',
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      attributeRequestMethod: OidcAttributeRequestMethod.GET,
      issuerUrl: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/v2.0`,
      attributeMapping: {
        email: ProviderAttribute.other('email'),
        fullname: ProviderAttribute.other('name'),
        phoneNumber: ProviderAttribute.other('phoneNumber'),
        profilePicture: ProviderAttribute.other('picture'),
      },
      scopes: ['openid', 'profile', 'email'],
    });



    const userPoolClient = new UserPoolClient(this, 'HoorainUserPoolClient', {
      userPool,
      userPoolClientName: 'HoorainUserPoolClient',
      generateSecret: true,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      supportedIdentityProviders: [
        UserPoolClientIdentityProvider.COGNITO, // native username/password
        UserPoolClientIdentityProvider.GOOGLE,
        UserPoolClientIdentityProvider.custom('MicrosoftIdp'),
      ],
      oAuth: {
        flows: { authorizationCodeGrant: true },
        callbackUrls: [
          'http://localhost:3000/api/auth/callback/cognito',
          `${process.env.VERCEL_URL}/api/auth/callback/cognito`,
        ],
        defaultRedirectUri: `${process.env.VERCEL_URL}/api/auth/callback/cognito`,
        logoutUrls: ['http://localhost:3000/', `${process.env.VERCEL_URL}`],
        scopes: [
          { scopeName: 'openid' },
          { scopeName: 'email' },
          { scopeName: 'profile' },
        ],
      },
    })


    // 4️⃣ Tell the App Client to allow Google
    userPoolClient.node.addDependency(googleProvider);
    userPoolClient.node.addDependency(mircosoftProvider);

    new UserPoolDomain(this, 'HoorainUserPoolDomain2', {
      userPool: userPool,
      cognitoDomain: { domainPrefix: 'hoorain' },
      managedLoginVersion: ManagedLoginVersion.NEWER_MANAGED_LOGIN
    })


    // 📦 Output values
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
    })

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
    })

    // new cdk.CfnOutput(this, 'UserPoolClientSecrect', {
    // value: userPoolClient.userPoolClientSecret.,
    // })
  }
}
