const listOneJoinService = async (
  Request,
  DataModel,
  searchArray,
  joinStage1
) => {
  let pageNo = Number(Request.params.pageNo);
  let perPage = Number(Request.params.perPage);
  let searchKeyword = Request.params.searchKeyword;
  let skipRow = (pageNo - 1) * perPage;
  //   let userId = req?.user?.userId;
  let userId = "test-123+1757268600168";

  try {
    let data;
    if (searchKeyword !== "0") {
      data = await DataModel.aggregate([
        { $match: { userId: userId } },
        joinStage1,
        { $match: { $or: searchArray } },
        { $project: { password: 0 } },
        {
          $facet: {
            total: [{ $count: "count" }],
            rows: [{ $skip: skipRow }, { $limit: perPage }],
          },
        },
      ]);
    } else {
      data = await DataModel.aggregate([
        { $match: { userId: userId } },
        joinStage1,
        { $project: { password: 0 } },
        {
          $facet: {
            total: [{ $count: "count" }],
            rows: [{ $skip: skipRow }, { $limit: perPage }],
          },
        },
      ]);
    }
    return { status: "success", data };
  } catch (error) {
    return { status: "fail", data: error.toString() };
  }
};

module.exports = listOneJoinService;
