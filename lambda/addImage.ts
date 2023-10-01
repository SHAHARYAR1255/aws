import AWS = require("aws-sdk");
const s3 = new AWS.S3();

const BUCKET_NAME = process.env.DIARY_BUCKET || "";
// const BUCKET_NAME = "DiaryBucket";

module.exports.handler = async (event: any) => {
  console.log("event", event);

  
  const response = {
    isBase64Encoded: false,
    statusCode: 200,
    body: JSON.stringify({ message: "Successfully uploaded file to S3" }),
  };

  try {
     // Parse the request body to get the binary data (file content)
     const fileContent = Buffer.from(event.body, 'base64');

    // const parsedBody = JSON.parse(event.body);
    // const base64File = parsedBody.file;
    // const decodedFile = Buffer.from(
    //   base64File.replace(/^data:image\/\w+;base64,/, ""),
    //   "base64"
    // );
    console.log("fileContent",fileContent)
    const params = {
      Bucket: BUCKET_NAME,
      Key: `1233456.jpeg`,
      Body: fileContent,
      // ContentType: "image/jpeg",
    };

    const uploadResult = await s3.upload(params).promise();

    response.body = JSON.stringify({
      message: "Successfully uploaded file to S3",
      uploadResult,
    });
  } catch (e) {
    console.error(e);
    response.body = JSON.stringify({
      message: "File failed to upload",
      errorMessage: e,
    });
    response.statusCode = 500;
  }

  return response;
};
