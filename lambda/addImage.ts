// import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
// import {
//   PutCommand,
//   DynamoDBDocumentClient,
//   ScanCommand,
// } from "@aws-sdk/lib-dynamodb";
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
// const client = new DynamoDBClient({});
// const docClient = DynamoDBDocumentClient.from(client);
const client = new S3Client({ region: "us-east-1" });
// const AWS = require('aws-sdk');
// const docClient = new AWS.DynamoDB.DocumentClient();

async function addImage(image: any) {
  const file: any = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(image);
  });
  const bucketName = "ImagesBucket";
  console.log("uploading image to s3");
  const putObjectCommand = new PutObjectCommand({
    Bucket: bucketName,
    Key: file.name,
    Body: file,
  });
  try {
    const data = await client.send(putObjectCommand);
    return data;
    // process data.
  } catch (error) {
    // error handling.
    console.log("error in uploading image to s3");
    return "";
  } finally {
    console.log("successfully uploaded image to s3");
    return "";
  }

  //   const params = {
  //     TableName: process.env.IMAGES_TABLE,
  //     Item: image,
  //   };
  //   try {
  //     const command = new PutCommand(params);
  //     const response = await docClient.send(command);

  //     // await docClient.put(params).promise();
  //     console.log(response);
  //     return image;
  //   } catch (err) {
  //     console.log("DynamoDB error: ", err);
  //     return null;
  //   }
}

export default addImage;
