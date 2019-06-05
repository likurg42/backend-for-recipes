const mongoose = require("mongoose");
const Schema = mongoose.Schema;

//create Recipe Schema & model
const RecipeSchema = new Schema({
  name: {
    type: String,
    required: [true, "Name field is required"]
  },
  ingredients: [String],
  steps: [{
    stepDescription: [String],
    timer: Number
  }]
});

const Recipe = mongoose.model("recipe", RecipeSchema);

module.exports = Recipe;
