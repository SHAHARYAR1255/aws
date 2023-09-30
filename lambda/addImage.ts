import multipart = require('aws-lambda-multipart-parser');
import AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.handler = async (event: { body: string; headers: Record<string, string>; }) => {
  try {
    // Parse the incoming multipart/form-data request
    const body = JSON.parse(event.body);
    const formData = multipart.parse(body, event.headers);

    // Access the uploaded file from the form data
    const uploadedFile = formData.files['file']; // 'file' should match the field name in your form

    // Use the AWS SDK to upload the file to an S3 bucket
    const params = {
      Bucket: 'ImagesBucket',
      Key: 'path/to/uploaded/file.ext',
      Body: uploadedFile.content,
    };

    await s3.upload(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'File uploaded successfully' }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};
