const express = require('express');
const path = require("path");
const fs = require("fs");

const router = express.Router();
const Recipes = require("../models/recipes");

router.use(express.urlencoded({ extended: true }));
router.use(express.json());


/* GET */

// get a list of recipes from the db
router.get("/recipes", (req, res, next) => {
    if (Object.keys(req.query).length > 0) {
        Recipes.findRecipes(req.query).then(result => res.send(result)).catch(err => console.error(err));
    } else {
        Recipes.find({}).then(result => res.send(result)).catch(err => console.error(err));
    }
});

router.get("/recipes/min/", (req, res, next) => {
})


// get recipe by id
router.get("/recipes/:id", (req, res, next) => {
    Recipes.findById({ _id: req.params.id })
        .then(recipe => {
            res.contentType("application/json");
            res.send(recipe);
        })
        .catch(next);
});

// get random recipe
router.get("/random", (req, res, next) => {
    Recipes.countDocuments({}, (err, count) => {
        const r = Math.floor(Math.random() * count);
        Recipes.find()
            .limit(1)
            .skip(r)
            .then(recipe => {
                res.send(recipe);
            })
            .catch(next);
    });
    res.send('hi');
});

/* POST */

// add a new recipe to the db
router.post("/recipes", (req, res, next) => {
    if (!req.body) res.sendStatus(400);
    Recipes.create(req.body)
        .then(recipe => res.send(recipe))
        .catch(err => console.error(err));

});

/* PUT */

// update recipe
router.put("/recipes/:id", (req, res, next) => {
    Recipes.findByIdAndUpdate({ _id: req.params.id }, req.body).then(() => {
        Recipes.findOne({ _id: req.params.id })
            .then(recipe => res.send(recipe))
            .catch(next);
    });
});

/* DELETE */

// delete recipe from database
router.delete("/recipes/:id", (req, res, next) => {
    Recipes.findByIdAndRemove({ _id: req.params.id })
        .then(recipe => {
            res.send(recipe);
        })
        .catch(next);
});

module.exports = router;
