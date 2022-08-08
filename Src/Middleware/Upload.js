import multer from "multer";
var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "Src/Uploads");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname +
      "_" +
      Date.now() +
      "." +
      file.originalname.split(".").pop()
    );
  },
});
var upload = multer({ storage: storage });
export default upload;
