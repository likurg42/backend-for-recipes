const express = require("express");
const router = express.Router();
const Recipes = require("../models/recipes");
const Todos = require("../models/todos");



/* TODO API */
router.get('/todos', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE'); // If needed
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type'); // If needed
  res.setHeader('Access-Control-Allow-Credentials', true); // If needed

  console.log('get');
  Todos.find().then(todo => res.send(todo)).catch(next);
})

router.get("/todos/:id", (req, res, next) => {
  Todos.findById({ _id: req.params.id }).then(todos => res.send(todo).catch(next));
});

router.post("/todos", (req, res, next) => {
  console.log(req.body); // show data being added
  Todos.create(req.body)
    .then(todo => {
      res.send(todo);
    })
    .catch(next);
});

router.put("/recipes/:id", (req, res, next) => {
  Todos.findByIdAndUpdate({ _id: req.params.id }, req.body).then(() => {
    Todos.findOne({ _id: req.params.id })
      .then(todo => res.send(todo))
      .catch(next);
  });
});

router.delete("/recipes/:id", (req, res, next) => {
  Todos.findByIdAndRemove({ _id: req.params.id })
    .then(todo => {
      res.send(todo);
    })
    .catch(next);
});

/* Recipes API */

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

// udpate ninja
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
