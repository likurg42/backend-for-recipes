const express = require("express");
const router = express.Router();
const Recipes = require("../models/recipes");


// get a list of recipes from the db
router.get("/recipes", (req, res, next) => {
  Recipes.find().then(recipes => res.send(recipes)).catch(next);
});

// get recipe by id
router.get("/recipes/:id", (req, res, next) => {
  Recipes.findById({ _id: req.params.id }).then(recipe => res.send(recipe).catch(next));
});

// add a new recipe to the db
router.post("/recipes", (req, res, next) => {
  console.log(req.body); // show data being added
  Recipes.create(req.body)
    .then(recipe => {
      res.send(recipe);
    })
    .catch(next);
});

// udpate recipe
router.put("/recipes/:id", (req, res, next) => {
  Recipes.findByIdAndUpdate({ _id: req.params.id }, req.body).then(() => {
    Recipes.findOne({ _id: req.params.id })
      .then(recipe => res.send(recipe))
      .catch(next);
  });
});

// delete recipe from database
router.delete("/recipes/:id", (req, res, next) => {
  Recipes.findByIdAndRemove({ _id: req.params.id })
    .then(recipe => {
      res.send(recipe);
    })
    .catch(next);
});

module.exports = router;
