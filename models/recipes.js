const mongoose = require('mongoose');

const { Schema } = mongoose;

// create Recipe Schema & model
const RecipeSchema = new Schema(
    {
        name: {
            type: String,
            // required: [true, "Name is required"]
            trim: true,
        },
        description: {
            type: String,
            // required: [true, "Description is required"]
        },
        categories: [
            {
                type: String,
            },
        ],
        imagePreviewDownloadUrl: {
            type: String,
        },
        imagePreviewAbsoluteUrl: {
            type: String,
        },
        ingredients: [
            {
                name: String,
                amount: Number,
                unit: String,
            },
        ],
        steps: [
            {
                description: {
                    type: String,
                    // required: [true, "At least one step is required"]
                },
                imageDownloadUrl: String,
                imageAbsoluteUrl: String,
                timer: {
                    type: Number,
                },
                timeUnit: {
                    type: String,
                },
            },
        ],
        originalRecipeUrl: String,
        rating: Number,
        difficulty: {
            type: Number,
            // required: [true, "Difficulty is required"]
        },
        timeToComplete: {
            type: Number,
            // required: [true, "Time to complete is required"]
        },
        cost: {
            type: Number,
            // required: [true, 'Cost is required']
        },
    },
    {
        collation: {
            locale: 'ru',
            strength: 2,
        },
    },
);

RecipeSchema.index({ name: 'text' });

RecipeSchema.statics = {
    parseQuery(query) {
        const mongoQuery = {};
        const queryKeys = Object.keys(query);
        if (queryKeys.length > 0) {
            queryKeys.forEach((key) => {
                if (query[key] !== null && key === 'name') {
                    mongoQuery.name = new RegExp(query[key], 'gi');
                }
                if (query[key] !== null && Array.isArray(query[key]) && key === 'categories') {
                    mongoQuery.categories = { $in: query[key] };
                }
                if (query[key] !== null && Array.isArray(query[key]) && key === 'tags') {
                    mongoQuery.tags = { $in: query[key] };
                }
            });
            return mongoQuery;
        }

        return mongoQuery;
    },
    getFullRecipes(query, cb) {
        return this.find(this.parseQuery(query), cb);
    },
    getMinRecipes(query, cb) {
        return this.find(
            this.parseQuery(query),
            {
                _id: 1,
                name: 1,
                description: 1,
                categories: 1,
                rating: 1,
                difficulty: 1,
                timeToComplete: 1,
                imagePreviewDownloadUrl: 1,
            },
            cb,
        );
    },
};

const Recipe = mongoose.model('recipe', RecipeSchema);

module.exports = Recipe;
