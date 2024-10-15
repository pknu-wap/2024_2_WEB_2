import React from "react";
import ImageUploader from "./ImageUploader";

const ThumbnailUploader = ({
  imgText,
  thumbnail,
  errorMessage,
  handleThumbnailUpload,
}) => {
  return (
    <ImageUploader
      imgText={imgText}
      imgName={thumbnail}
      errorMessage={errorMessage}
      handleImgUpload={handleThumbnailUpload}
    />
  );
};

export default ThumbnailUploader;
