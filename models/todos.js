const mongoose = require("mongoose");
const Schema = mongoose.Schema;

//create Recipe Schema & model
const TodosScema = new Schema({
  title: {
    type: String,
    required: true
  },
  completed: {
    type: Boolean,
    required: true
  }
});

const Todos = mongoose.model("todo", TodosScema);

module.exports = Todos;
