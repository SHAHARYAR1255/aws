// import * as cdk from "aws-cdk-lib";
// import { Construct } from "constructs";
// import * as lambda from "aws-cdk-lib/aws-lambda";
// import * as apigateway from "aws-cdk-lib/aws-apigateway";
// import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
// import * as stepfunctions from "aws-cdk-lib/aws-stepfunctions";
// import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
// import * as s3 from "aws-cdk-lib/aws-s3";
// import { App, Stack, RemovalPolicy, Duration } from "aws-cdk-lib";
// import * as iam from "aws-cdk-lib/aws-iam";
// import * as logs from "aws-cdk-lib/aws-logs";

// export class AwsStack extends cdk.Stack {
//   constructor(scope: Construct, id: string, props?: cdk.StackProps) {
//     super(scope, id, props);

//     //images bucket
//     const bucket = new s3.Bucket(this, "ImagesBucket");

//     // Step 1: Define your DynamoDB table
//     // a dynanodb table
//     const imagesTable = new dynamodb.Table(this, "imagesTable", {
//       partitionKey: {
//         name: "id",
//         type: dynamodb.AttributeType.STRING,
//       },
//       billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
//       removalPolicy: RemovalPolicy.DESTROY,
//     });

//     // Step 2: Define your Lambda functions
//     // lambda function that will put an item on imagesTable

//     const imagesTableLambda = new lambda.Function(this, "imagesTableFunction", {
//       runtime: lambda.Runtime.NODEJS_18_X,
//       handler: "addImage.handler",
//       code: lambda.Code.fromAsset("lambda"),
//       timeout: Duration.seconds(10),
//     });

//     //give full permission to imagesTableLambda to access imagesTable
//     imagesTable.grantFullAccess(imagesTableLambda);

//     //add the tables name to env
//     imagesTableLambda.addEnvironment("IMAGES_TABLE", imagesTable.tableName);

//     const updateDynamoDBLambda = new lambda.Function(
//       this,
//       "UpdateDynamoDBLambda",
//       {
//         runtime: lambda.Runtime.NODEJS_18_X,
//         handler: "db.handler",
//         code: lambda.Code.fromAsset("lambda"),
//       }
//     );

//     // Step 3: Create a Step Functions state machine
//     const processImageStateMachine = new stepfunctions.StateMachine(
//       this,
//       "ProcessImageStateMachine",
//       {
//         stateMachineType: stepfunctions.StateMachineType.EXPRESS,
//         timeout: cdk.Duration.minutes(2),
//         logs: {
//           level: stepfunctions.LogLevel.ALL,
//           destination: new logs.LogGroup(this, "SFNLogGroup", {
//             retention: logs.RetentionDays.ONE_DAY,
//           }),
//           includeExecutionData: true,
//         },
//         definition: new tasks.LambdaInvoke(this, "StoreImageToS3", {
//           lambdaFunction: imagesTableLambda,
//           taskTimeout: stepfunctions.Timeout.duration(cdk.Duration.minutes(1)),
//         }).next(
//           new tasks.LambdaInvoke(this, "UpdateDynamoDB", {
//             lambdaFunction: updateDynamoDBLambda,
//             taskTimeout: stepfunctions.Timeout.duration(
//               cdk.Duration.minutes(1)
//             ),
//           })
//         ),
//       }
//     );

//     // Step 4: Create an API Gateway REST API
//     const devLogGroup = new logs.LogGroup(this, "DevLogs");

//     const api = new apigateway.RestApi(this, "ImageProcessingApi", {
//       deployOptions: {
//         accessLogDestination: new apigateway.LogGroupLogDestination(
//           devLogGroup
//         ),
//         accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
//       },
//       defaultCorsPreflightOptions: {
//         allowOrigins: apigateway.Cors.ALL_ORIGINS,
//         allowMethods: apigateway.Cors.ALL_METHODS,
//         allowHeaders: ["*"],
//         allowCredentials: true,
//       },
//     });
//     // role for api gateway to operate state maching
//     const invokeSFNAPIRole = new iam.Role(this, "invokeSFNAPIRole", {
//       assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
//       inlinePolicies: {
//         allowSFNInvoke: new iam.PolicyDocument({
//           statements: [
//             new iam.PolicyStatement({
//               effect: iam.Effect.ALLOW,
//               actions: ["states:StartSyncExecution"],
//               resources: [processImageStateMachine.stateMachineArn],
//             }),
//           ],
//         }),
//       },
//     });

//     // Step 5: Define API Gateway resources, methods, and integrations
//     const imageResource = api.root.addResource("image");

//     // const processImageIntegration = new apigateway.Integration({
//     //   type: apigateway.IntegrationType.AWS,
//     //   integrationHttpMethod: "POST",
//     //   uri: `arn:aws:apigateway:${cdk.Aws.REGION}:states:action/StartSyncExecution`,
//     //   options: {
//     //     passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
//     //     credentialsRole: invokeSFNAPIRole,
//     //     // requestTemplates: {
//     //     //   "application/json": `{
//     //     //   "input": "{\\"actionType\\": \\"create\\", \\"body\\": $util.escapeJavaScript($input.json('$'))}",
//     //     //   "stateMachineArn": "${processImageStateMachine.stateMachineArn}"
//     //     // }`,
//     //     // },
//     //     requestTemplates: {
//     //       "multipart/form-data": `
//     //         #set($inputRoot = $input.path('$'))
//     //         #set($formData = {})

//     //         #foreach($part in $inputRoot.parts)
//     //           #set($formData["$part.name"] = {
//     //             "contentType": "$part.contentType",
//     //             "content": "$util.base64Encode($part.content)"
//     //           })
//     //         #end

//     //         {
//     //           "input": {
//     //             "actionType": "create",
//     //             "body": $util.escapeJavaScript($input.json('$')),
//     //             "files": $util.escapeJavaScript($util.toJson($formData))
//     //           },
//     //           "stateMachineArn": "${processImageStateMachine.stateMachineArn}"
//     //         }
//     //       `,
//     //     },
//     //     integrationResponses: [
//     //       {
//     //         selectionPattern: "200",
//     //         statusCode: "201",
//     //         responseTemplates: {
//     //           "application/json": `
//     //             #set($inputRoot = $input.path('$'))

//     //             #if($input.path('$.status').toString().equals("FAILED"))
//     //               #set($context.responseOverride.status = 500)
//     //               {
//     //                 "error": "$input.path('$.error')",
//     //                 "cause": "$input.path('$.cause')"
//     //               }
//     //             #else
//     //               {
//     //                 "id": "$context.requestId",
//     //                 "output": "$util.escapeJavaScript($input.path('$.output'))"
//     //               }
//     //             #end
//     //           `,
//     //         },
//     //         responseParameters: {
//     //           "method.response.header.Access-Control-Allow-Methods":
//     //             "'OPTIONS,GET,PUT,POST,DELETE,PATCH,HEAD'",
//     //           "method.response.header.Access-Control-Allow-Headers":
//     //             "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
//     //           "method.response.header.Access-Control-Allow-Origin": "'*'",
//     //           "method.response.header.Content-Type": "*",
//     //         },
//     //       },
//     //     ],
//     //   },
//     // });

//     const processImageIntegration = new apigateway.LambdaIntegration(imagesTableLambda);
//     // imageResource.addMethod("GET",)
//     // Define a POST method for processing images
//     imageResource.addMethod("POST", processImageIntegration, {
//       // methodResponses: [
//       //   {
//       //     statusCode: "201",
//       //     responseParameters: {
//       //       "method.response.header.Access-Control-Allow-Methods": true,
//       //       "method.response.header.Access-Control-Allow-Headers": true,
//       //       "method.response.header.Access-Control-Allow-Origin": true,
//       //     },
//       //   },
//       // ],
//     });
//     // Output the API Gateway endpoint URL
//     new cdk.CfnOutput(this, "ImageProcessingApiEndpoint", {
//       value: api.url,
//     });

//     // Prints out the stack region to the terminal
//     new cdk.CfnOutput(this, "Stack Region", {
//       value: this.region,
//     });
//   }
// }

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as stepfunctions from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as s3 from "aws-cdk-lib/aws-s3";
import { App, Stack, RemovalPolicy, Duration } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";

export class DiaryStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //images bucket
    const bucket = new s3.Bucket(this, "DiaryBucket", {
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const DiaryBucketLambda = new lambda.Function(this, "DiaryBucketFunction", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "addImage.handler",
      code: lambda.Code.fromAsset("lambda"),
      timeout: Duration.seconds(10),
    });

    DiaryBucketLambda.addEnvironment("DIARY_BUCKET", bucket.bucketName);

    // bucket access to lambda

    bucket.grantReadWrite(DiaryBucketLambda);

    //     // Step 4: Create an API Gateway REST API
    const devLogGroup = new logs.LogGroup(this, "DiaryLogs");

    const api = new apigateway.RestApi(this, "DiaryApi", {
      deployOptions: {
        accessLogDestination: new apigateway.LogGroupLogDestination(
          devLogGroup
        ),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ["*"],
        allowCredentials: true,
      },
    });

    const diaryResource = api.root.addResource("images");
    // Configure the integration to pass the entire request to the Lambda function
    const imageLambdaIntegration = new apigateway.LambdaIntegration(
      DiaryBucketLambda ,{
      }
    );
    diaryResource.addMethod("POST", imageLambdaIntegration);
    DiaryBucketLambda.addPermission('PermitAPIGInvocation', {
      principal: new ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: api.arnForExecuteApi('*')
    });
    // Note: You may need to adjust the permissions based on your use case
    // DiaryBucketLambda.addPermission('InvokePermission', {
    //   action: 'lambda:InvokeFunction',
    //   principal: new apigateway.AnyAuthorizer().authorizerArn,
    // });

    // Create an IAM role for the API Gateway
    const role = new Role(this, "my-role", {
      assumedBy: new ServicePrincipal("apigateway.amazonaws.com"),
    });

    // Create an IAM policy statement to allow executing the Lambda function
    const lambdaExecutionPolicyStatement = new iam.PolicyStatement({
      actions: ["lambda:InvokeFunction"],
      resources: [DiaryBucketLambda.functionArn],
    });

    // Create an IAM policy for API Gateway execution
    const apiGatewayExecutionPolicy = new iam.Policy(
      this,
      "ApiGatewayExecutionPolicy",
      {
        statements: [lambdaExecutionPolicyStatement],
      }
    );
    // Attach the policy to the IAM role
    role.attachInlinePolicy(apiGatewayExecutionPolicy);
    // Bind the IAM role to the API Gateway
    // api.bindToRole(role);
    // Attach the policy to the execution role of the API Gateway
    // const apiGatewayExecutionRole = api.role;
    // apiGatewayExecutionRole.attachInlinePolicy(apiGatewayExecutionPolicy);
  }
}
