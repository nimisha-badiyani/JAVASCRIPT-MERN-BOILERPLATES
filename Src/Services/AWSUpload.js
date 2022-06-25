import AWS from "aws-sdk";
import fs from "fs";
import {
  AWS_ACCESS_KEY,
  AWS_BUCKET,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION,
} from "./Config";

// @AWS-CONFIG
var credentials = {
  accessKeyId: AWS_ACCESS_KEY,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
};
AWS.config.update({ credentials: credentials, region: AWS_REGION });
const s3 = new AWS.S3();

/* 

* Note:- For better way we can add more folder in any specific user Account. Just support we have a record and we are creating Blog Project then we can create flow like that
const userData = {
  _id:"3144dd484d6a5d789d4as5d",
  name:"Test User",
  profileImage:"profileImage/filekey",
  BlogImage:"blogimage/filekey",
  FeaturedImages:"featuresimg/filekey",
  Document:"Doc/filekey"
}

So our data after insertion looklike this and we have to find all in specific user folder and we have create 


user_id/profileImage/key
user_id/BlogImage/key
user_id/FeaturedImages/key
user_id/Document/key

so its better to find user record and better to remove if any record need to remove.


and when we are removing any user we have to remove whole folder of the user 
 */

const AWSUpload = {
  // @Service: Upload File In Bucket
  uploadFile(folderName, folderPath, file) {
    const fileStream = fs.createReadStream(file.path);
    let uploadParams;
    if (folderPath) {
      uploadParams = {
        Bucket: AWS_BUCKET + `/${folderName}/${folderPath}`,
        Body: fileStream,
        Key: file.filename,
      };
    } else {
      uploadParams = {
        Bucket: AWS_BUCKET + `/${folderName}`,
        Body: fileStream,
        Key: file.filename,
      };
    }
    return s3.upload(uploadParams).promise();
  },
  // @Service: Read File In Bucket

  async getFile(fileKey) {
    const downloadParmas = {
      Key: fileKey,
      Bucket: AWS_BUCKET,
    };
    return s3.getObject(downloadParmas).createReadStream();
  },
  // @Service: GetSignedURL

  async getSignedUrl(fileKey) {
    const signedUrlExpireSeconds = 18000;
    try {
      const url = s3.getSignedUrl("getObject", {
        Bucket: AWS_BUCKET,
        Key: fileKey,
        Expires: signedUrlExpireSeconds,
      });
      return url;
    } catch (headErr) {
      console.log(headErr);
      if (headErr.code === "NotFound") {
        return false;
      }
    }
  },

  // @Service: Remove Object/Folder Inside Bucket

  async removeFolder(bucketName, folderName) {
    const listParams = {
      Bucket: bucketName,
      Prefix: `${folderName}/`,
    };
    console.log(bucketName, `${folderName}/`);
    const listedObjects = await s3.listObjectsV2(listParams).promise();

    if (listedObjects.Contents.length === 0) return;

    const deleteParams = {
      Bucket: bucketName,
      Delete: { Objects: [] },
    };

    listedObjects.Contents.forEach(({ Key }) => {
      deleteParams.Delete.Objects.push({ Key });
    });

    await s3.deleteObjects(deleteParams).promise();

    if (listedObjects.IsTruncated) await removeObj(bucketName, folderName);
  },

  async removeObj(bucketName, fileKey) {
    var params = { Bucket: AWS_BUCKET, Key: `images/${fileKey}` };
    console.log(params);
    return await s3.deleteObject(params, function (err, data) {
      if (err) {
        console.log(err);
      }
      console.log("success");
    });
  },
};

export default AWSUpload;
