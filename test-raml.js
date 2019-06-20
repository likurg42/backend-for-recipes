const raml2obj = require('raml2obj');

const raml = raml2obj.parse('recipes-api.raml').then(ramlObj => console.log(ramlObj.types.Recipe.properties));