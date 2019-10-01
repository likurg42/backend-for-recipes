const path = require("path");
const fs = require("fs");
const express = require('express');

const router = express.Router();

router.get('/example', (req, res) => {
    console.log('exaple');
    res.render('example', { title: "hi", header: "It' me" })
})

router.get('/test', (req, res) => {
    res.send('test');
});


router.get('/', (req, res) => {
    res.render('add-recipe', { title: "Добавить новый рецепт" });
});


router.get('/firestorage-upload-test', (req, res) => {
    res.render('firestorage-upload-test');
})


module.exports = router;