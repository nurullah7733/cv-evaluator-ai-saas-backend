const listService = async (Request, DataModel, searchArray) => {
  let pageNo = Number(Request.params.pageNo);
  let perPage = Number(Request.params.perPage);
  let searchKeyword = Request.params.searchKeyword;
  let skipRow = (pageNo - 1) * perPage;

  const userId = Request?.user?.userId;

  let data;

  try {
    if (searchKeyword !== "0") {
      data = await DataModel.aggregate([
        {
          $match: {
            clerkUserId: userId,
          },
        },
        { $match: { $or: searchArray } },
        { $sort: { createdAt: -1 } },
        {
          $facet: {
            total: [{ $count: "count" }],
            rows: [{ $skip: skipRow }, { $limit: perPage }],
          },
        },
      ]);
    } else {
      data = await DataModel.aggregate([
        { $match: { clerkUserId: userId } },
        { $sort: { createdAt: -1 } },
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

module.exports = listService;
