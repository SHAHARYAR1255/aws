import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as aws_appsync from "aws-cdk-lib/aws-appsync";
import * as s3 from "aws-cdk-lib/aws-s3";
import path = require("path");

export class AwsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //images bucket
    const bucket = new s3.Bucket(this, "ImagesBucket");

    // apsyncc code

    // Step 1: Define your GraphQL API using AWS AppSync
    // const api = new aws_appsync.GraphqlApi(this, 'ImageProcessingApi', {
    //   name: 'image-processing-api',
    //   definition: aws_appsync.Definition.fromFile('graphql/schema.graphql'), // Replace with your GraphQL schema file path
    //   authorizationConfig: {
    //     defaultAuthorization: {
    //       authorizationType: aws_appsync.AuthorizationType.API_KEY,
    //     },
    //   },
    // });
    
    const api = new aws_appsync.GraphqlApi(this, 'Api', {
      name: 'demo',
      definition: aws_appsync.Definition.fromFile('graphql/schema.graphql'),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: aws_appsync.AuthorizationType.IAM,
        },
      },
      xrayEnabled: true,
    });

    // a dynanodb table
    const imagesTable = new dynamodb.Table(this, "imagesTable", {
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // lambda function that will put an item on imagesTable

    const imagesTableLambda = new lambda.Function(this, "imagesTableFunction", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("lambda"),
    });

    //give full permission to imagesTableLambda to access imagesTable
    imagesTable.grantFullAccess(imagesTableLambda);

    //add the tables name to env
    imagesTableLambda.addEnvironment("IMAGES_TABLE", imagesTable.tableName);

    const lambdaDs = api.addLambdaDataSource(
      "lambdaDatasource",
      imagesTableLambda
    );

    lambdaDs.createResolver("CreateImage", {
      typeName: "Mutation",
      fieldName: "addImage",
    });

    //print
    // Prints out the AppSync GraphQL endpoint to the terminal
    new cdk.CfnOutput(this, "GraphQLAPIURL", {
      value: api.graphqlUrl,
    });

    // Prints out the AppSync GraphQL API key to the terminal
    new cdk.CfnOutput(this, "GraphQLAPIKey", {
      value: api.apiKey || "",
    });

    // Prints out the AppSync GraphQL API ID to the terminal
    new cdk.CfnOutput(this, "GraphQLAPIID", {
      value: api.apiId || "",
    });

    // Prints out the stack region to the terminal
    new cdk.CfnOutput(this, "Stack Region", {
      value: this.region,
    });
  }
}
