const mongoose = require("mongoose");
const Schema = mongoose.Schema;

//create Recipe Schema & model
const RecipeSchema = new Schema({
    name: {
        type: String,
        // required: [true, "Name is required"]
        trim: true
    },
    description: {
        type: String
        // required: [true, "Description is required"]
    },
    ingredients: [{
        name: String,
        amount: Number,
        unit: String
    }],
    steps: [{
        description: {
            type: String
            // required: [true, "At least one step is required"]
        },
        imageDownloadUrl: String,
        imageAbsoluteUrl: String,
        timer: {
            type: Number,
        }
    }],
    categories: [{
        type: String,
    }],
    tags: [{
        type: String,
    }],
    originalRecipeUrl: String,
    rating: Number,
    difficulty: {
        type: Number
        // required: [true, "Difficulty is required"]
    },
    timeToComplete: {
        type: Number
        // required: [true, "Time to complete is required"]
    },
    cost: {
        type: Number
        // required: [true, 'Cost is required']
    }
}, {
    collation: {
        locale: "ru",
        strength: 2
    }
});

RecipeSchema.index({ name: 'text' });

RecipeSchema.statics = {
    findRecipes: function (query, callback) {
        let mongoSearch = {};
        Object.keys(query).forEach(key => {
            if (query[key] !== null && key === 'name') {
                mongoSearch.name = new RegExp(query[key], "gi");
            }
            if (query[key] !== null && Array.isArray(query[key]) && key === 'categories') {
                mongoSearch.categories = { "$in": query[key] }
            }
            if (query[key] !== null && Array.isArray(query[key]) && key === 'tags') {
                mongoSearch.tags = { "$in": query[key] }
            }
        })
        return this.find(mongoSearch, callback);
    }
}

const Recipe = mongoose.model("recipe", RecipeSchema);

module.exports = Recipe;
