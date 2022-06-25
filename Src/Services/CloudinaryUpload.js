import cloudinary from "cloudinary";
const CloudinaryUpload = async (file, folder) => {
  const myCloud = await cloudinary.v2.uploader.upload(file, {
    folder: folder,
    width: 150,
    crop: "scale",
  });
  return {
    public_id: myCloud.public_id,
    url: myCloud.secure_url,
  };
};

export default CloudinaryUpload;
