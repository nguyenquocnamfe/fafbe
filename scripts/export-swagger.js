const fs = require('fs');
// src/config/swagger.js already exports the generated specs
const specs = require('../src/config/swagger'); 

fs.writeFileSync('swagger.json', JSON.stringify(specs, null, 2));
console.log('Swagger JSON exported to swagger.json');
console.log('You can send this file to your FE team or upload to swagger.io');
