const { model, Schema } = require("mongoose");

const customTextSchema = new Schema({
  value: String,
});

const CustomText = model("CustomText", customTextSchema);
module.exports = CustomText