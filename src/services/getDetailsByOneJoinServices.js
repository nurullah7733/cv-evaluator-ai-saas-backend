const { default: mongoose } = require("mongoose");

const getDetailsByIdOneJoinService = async (Request, DataModel, joinStage1) => {
  let id = Request.params.id;
  let userId = Request?.user?.userId;

  try {
    if (mongoose.Types.ObjectId.isValid(id)) {
      let query = {};
      query._id = new mongoose.Types.ObjectId(id);
      query.clerkUserId = userId;

      let data;
      data = await DataModel.aggregate([{ $match: query }, joinStage1]);

      return { status: "success", data };
    } else {
      return { status: "fail", data: "Invalid Id" };
    }
  } catch (error) {
    return { status: "fail", data: error.toString() };
  }
};

module.exports = getDetailsByIdOneJoinService;
