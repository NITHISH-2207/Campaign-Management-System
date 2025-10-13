const surveyController = require('./controllers/surveyController');

console.log('Available methods in surveyController:');
Object.keys(surveyController).forEach(key => {
    console.log(`- ${key}: ${typeof surveyController[key]}`);
});
