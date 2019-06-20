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
    stepDescription: [{
      type: String,
      required: [true, "At least one step is required"]
    }],
    stepImage: [Buffer],
    timer: {
      type: Number,
      required: [true, "At least on timer is required"]
    }
  }],
  tags: {
    type: String
  }
});


const Recipe = mongoose.model("recipe", RecipeSchema);

module.exports = Recipe;
