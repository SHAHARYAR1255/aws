import addImage from "./addImage";

type AppSyncEvent = {
  info: {
    fieldName: string;
  };
  arguments: {
    image: File;
  };
};

exports.handler = async (event: AppSyncEvent) => {
  switch (event.info.fieldName) {
    case "addImage":
      return await addImage(event.arguments.image);
    default:
      return null;
  }
};
