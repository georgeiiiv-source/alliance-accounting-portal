import { S3Client } from "@aws-sdk/client-s3";
export const s3=new S3Client({region:process.env.S3_REGION??'us-east-1',credentials:process.env.S3_ACCESS_KEY_ID&&process.env.S3_SECRET_ACCESS_KEY?{accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY}:undefined});
