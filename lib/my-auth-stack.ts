import * as path from 'path';
import { config } from "dotenv";
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { AccountRecovery, CfnUserPoolIdentityProvider, ManagedLoginVersion, OidcAttributeRequestMethod, ProviderAttribute, UserPool, UserPoolClient, UserPoolClientIdentityProvider, UserPoolDomain,  UserPoolIdentityProviderAmazon, UserPoolIdentityProviderGoogle, UserPoolIdentityProviderOidc } from 'aws-cdk-lib/aws-cognito';

import { UserPoolIdentityProviderGithub } from 'cdk-user-pool-identity-provider-github';

import { Construct as AWSConstruct } from "@aws-cdk/core/lib/construct-compat"


config({
  path: path.resolve(process.cwd(), '.env.local')
})


export class AuthStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // 🔐 User Pool
    const userPool = new UserPool(this, 'HoorainUserPool2', {
      userPoolName: 'HoorainUserPool2',
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


    // Twitter Provider
    // const twitterProvider = new CfnUserPoolIdentityProvider(this, 'TwitterIdp', {
    //   providerName: 'Twitter',
    //   providerType: 'OIDC',
    //   userPoolId: userPool.userPoolId,
    //   providerDetails: {
    //     client_id: process.env.TWITTER_CONSUMER_API_KEY!,
    //     client_secret: process.env.TWITTER_CONSUMER_API_SECRET!,
    //     attributes_request_method: 'GET',
    //     issuer: 'https://cognito-oidc.us.auth0.com/',        
    //     authorize_scopes: 'read', // or adjust as needed
    //   },
    //   attributeMapping: {
    //     email: 'email',
    //     // username: 'screen_name',
    //     // profilePicture: 'profile_image_url_https',
    //   },
    // });


    // GitHub Provider
    // const githubProvider = new CfnUserPoolIdentityProvider(this, 'GitHubIdp', {
    //   providerName: 'GitHub',
    //   providerType: 'OIDC',
    //   userPoolId: userPool.userPoolId,
    //   providerDetails: {
    //     client_id: process.env.GITHUB_CLIENT_ID!,
    //     client_secret: process.env.GITHUB_CLIENT_SECRET!,
    //     issuer: 'https://cognito-oidc.us.auth0.com/',
    //     authorize_scopes: 'read', // or adjust as needed
    //     attributes_request_method: 'GET',

    //   },
    //   attributeMapping: {
    //     email: 'email',
    //     // username: 'screen_name',
    //     // profilePicture: 'profile_image_url_https',
    //   },
    // });


    // 3️⃣ Google IdP
    // const amazonProvider = new UserPoolIdentityProviderAmazon(this, 'GoogleIdp', {
    //   userPool,
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    //   scopes: ['openid', 'email', 'profile'],
    //   attributeMapping: {
    //     email: ProviderAttribute.GOOGLE_EMAIL,
    //     fullname: ProviderAttribute.GOOGLE_NAME,
    //     phoneNumber: ProviderAttribute.GOOGLE_PHONE_NUMBERS,
    //     profilePicture: ProviderAttribute.GOOGLE_PICTURE
    //   },
    // });


    const twitterProvider = new UserPoolIdentityProviderOidc(this, 'TwitterIdp', {
      userPool,
      name: 'TwitterIdp',
      clientId: process.env.OAUTH0_CLIENT_ID!,
      clientSecret: process.env.OAUTH0_CLIENT_SECRET!,
      issuerUrl: 'https://cognito-oidc.us.auth0.com/',
      scopes: ['openid', 'email', 'profile'],
      endpoints: {
        authorization: 'https://cognito-oidc.us.auth0.com/authorize',
        jwksUri: 'https://cognito-oidc.us.auth0.com/.well-known/jwks.json',
        token: 'https://cognito-oidc.us.auth0.com/oauth/token',
        userInfo: 'https://cognito-oidc.us.auth0.com/userinfo'
      },
      attributeMapping: {
        email: ProviderAttribute.other('email'),
        fullname: ProviderAttribute.other('nickname'),
        phoneNumber: ProviderAttribute.other('phone_number'),
        // profilePicture: ProviderAttribute.other('profile_image_url_https'),
      }
    })


    // const githubProvider = new UserPoolIdentityProviderOidc(this, 'GitHubIdp', {
    //   userPool,
    //   name: 'GitHubIdp',
    //   clientId: process.env.GITHUB_CLIENT_ID!,
    //   clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    //   issuerUrl: 'https://cognito-oidc.us.auth0.com/',

    //   scopes: ['openid', 'email', 'profile'],
    //   endpoints: {
    //     authorization: 'https://cognito-oidc.us.auth0.com/authorize',
    //     jwksUri: 'https://cognito-oidc.us.auth0.com/.well-known/jwks.json',
    //     token: 'https://cognito-oidc.us.auth0.com/oauth/token',
    //     userInfo: 'https://cognito-oidc.us.auth0.com/userinfo'
    //   },
    //   attributeMapping: {
    //     email: ProviderAttribute.other('email'),
    //     fullname: ProviderAttribute.other('name'),
    //     phoneNumber: ProviderAttribute.other('phone_number'),
    //     // profilePicture: ProviderAttribute.other('profile_image_url_https'),
    //   }
    // })



    // 👤 User Pool Client




    const githubProvider = new CfnUserPoolIdentityProvider(this, 'GitHubIdp', {
      providerName: 'GitHubIdp', // must match the frontend URL later
      providerType: 'OIDC',
      userPoolId: userPool.userPoolId,
      providerDetails: {
        client_id: process.env.GITHUB_CLIENT_ID!,
        client_secret: process.env.GITHUB_CLIENT_SECRET!,
        attributes_request_method: 'GET',
        authorize_scopes: 'read:user user:email email profile openid',

        token_url: 'https://github.com/login/oauth/access_token',
        attributes_url: 'https://api.github.com/user',
        oidc_issuer: "https://token.actions.githubusercontent.com",
        authorize_url: "https://github.com/login/oauth/authorize",
        jwks_uri: "https://token.actions.githubusercontent.com/.well-known/jwks.json",

      },
      attributeMapping: {
        email: 'email',
        // fullname: 'username',
      },
    });

    const mircosoftProvider = new UserPoolIdentityProviderOidc(this, 'MicrosoftIdp', {
      userPool, 
      name: 'MicrosoftIdp',
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      attributeRequestMethod: OidcAttributeRequestMethod.GET,
      issuerUrl: 'https://login.microsoftonline.com/common/v2.0',
      attributeMapping: {
        email: ProviderAttribute.other('email'),
        fullname: ProviderAttribute.other('name'),
        phoneNumber: ProviderAttribute.other('phoneNumber'),
        profilePicture: ProviderAttribute.other('picture'),
      },
      scopes: ['openid', 'profile', 'email'],
    });

    const mircosoftProviderN = new UserPoolIdentityProviderOidc(this, 'MicrosoftIdpN', {
      userPool,
      name: 'MicrosoftIdpN',
      clientId: process.env.N_MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.N_MICROSOFT_CLIENT_SECRET!,
      attributeRequestMethod: OidcAttributeRequestMethod.GET,
      issuerUrl: `https://login.microsoftonline.com/${process.env.N_MICROSOFT_TENANT_ID}/v2.0`,
      attributeMapping: {
        email: ProviderAttribute.other('email'),
        fullname: ProviderAttribute.other('name'),
        phoneNumber: ProviderAttribute.other('phoneNumber'),
        profilePicture: ProviderAttribute.other('picture'),
      },
      scopes: ['openid', 'profile', 'email'],
    });




    const userPoolClient = new UserPoolClient(this, 'HoorainUserPoolClient2', {
      userPool,
      userPoolClientName: 'HoorainUserPoolClient2',
      generateSecret: true,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      supportedIdentityProviders: [
        UserPoolClientIdentityProvider.COGNITO, // native username/password
        UserPoolClientIdentityProvider.GOOGLE,
        // UserPoolClientIdentityProvider.AMAZON,
        UserPoolClientIdentityProvider.custom('GitHubIdp'),
        UserPoolClientIdentityProvider.custom('TwitterIdp'),
        UserPoolClientIdentityProvider.custom('MicrosoftIdp'),
        UserPoolClientIdentityProvider.custom('MicrosoftIdpN'),
      ],
      oAuth: {
        flows: { authorizationCodeGrant: true },
        callbackUrls: [
          'http://localhost:3000/api/auth/callback/cognito',
          'http://localhost:3000/api/auth/callback/microsoft',
          'https://ecommerce-refine.vercel.app/api/auth/callback/cognito',
          'https://ecommerce-refine.vercel.app/api/auth/callback/microsoft',
        ],
        defaultRedirectUri: "https://ecommerce-refine.vercel.app/api/auth/callback/cognito",
        logoutUrls: ['http://localhost:3000/', 'https://ecommerce-refine.vercel.app/'],
        scopes: [
          { scopeName: 'openid' },
          { scopeName: 'email' },
          { scopeName: 'profile' },
        ],
      },
    })


    // 4️⃣ Tell the App Client to allow Google
    userPoolClient.node.addDependency(googleProvider);
    userPoolClient.node.addDependency(githubProvider);
    userPoolClient.node.addDependency(twitterProvider);
    userPoolClient.node.addDependency(mircosoftProvider);
    userPoolClient.node.addDependency(mircosoftProviderN);



    // GitHub IdP wrapper
    // const c = new AWSConstruct(this, '')

    // new UserPoolIdentityProviderGithub(this, 'GitHubIdP', {
    //   userPool,
    //   userPoolClient,
    //   clientId: process.env.GITHUB_CLIENT_ID,
    //   clientSecret: process.env.GITHUB_CLIENT_SECRET,
    // });





    const userPoolDomain = new UserPoolDomain(this, 'HoorainUserPoolDomain2', {
      userPool: userPool,
      cognitoDomain: {
        domainPrefix: 'hoorain2'
      },

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
