const fs = require('fs');
const path = require('path');
const original = require('../data/quizQuestions.js');

const crops = ['Wheat', 'Rice', 'Maize', 'Soybean', 'Cotton', 'Sugarcane', 'Groundnut', 'Mustard', 'Jute', 'Barley', 'Tomato', 'Potato', 'Onion', 'Apple', 'Mango'];
const nutrients = ['Nitrogen (N)', 'Phosphorus (P)', 'Potassium (K)', 'Calcium (Ca)', 'Magnesium (Mg)', 'Sulfur (S)', 'Zinc (Zn)', 'Iron (Fe)'];
const diseases = ['Blight', 'Rust', 'Smut', 'Mildew', 'Mosaic Virus', 'Wilt', 'Rot', 'Spot', 'Canker'];
const difficulties = ['Easy', 'Medium', 'Hard'];
const categories = ['Crops', 'Diseases', 'Fertilizers', 'Weather', 'Irrigation'];

const newQuestions = [];
let idCounter = 1000;

for (let i = 0; i < 10000; i++) {
  const crop = crops[Math.floor(Math.random() * crops.length)];
  const nutrient = nutrients[Math.floor(Math.random() * nutrients.length)];
  const disease = diseases[Math.floor(Math.random() * diseases.length)];
  const diff = difficulties[Math.floor(Math.random() * difficulties.length)];
  const cat = categories[Math.floor(Math.random() * categories.length)];
  
  let qText, ans, options, expl;
  
  const type = Math.floor(Math.random() * 4);
  
  if (type === 0) {
    qText = `Which of the following is a critical nutrient required for optimal ${crop} cultivation?`;
    ans = nutrient;
    options = [nutrient, 'Lead', 'Mercury', 'Sodium'];
    expl = `${nutrient} is essential for healthy ${crop} growth and development.`;
  } else if (type === 1) {
    qText = `Which disease commonly affects ${crop} causing potential yield reduction?`;
    ans = `${crop} ${disease}`;
    options = [`${crop} ${disease}`, 'Apple Scab', 'Citrus Canker', 'Banana Bunchy Top'];
    expl = `${crop} ${disease} is a known pathogen that can impact this crop if not managed.`;
  } else if (type === 2) {
    qText = `What is the generally recommended soil pH range for ${crop} farming?`;
    ans = '6.0 - 7.5';
    options = ['6.0 - 7.5', '3.0 - 4.0', '8.5 - 9.5', '1.0 - 2.0'];
    expl = `${crop} thrives best in slightly acidic to neutral soils (6.0 - 7.5).`;
  } else {
    qText = `How many days does a standard variety of ${crop} typically take to reach maturity?`;
    ans = '90 - 150 days';
    options = ['90 - 150 days', '10 - 20 days', '300 - 400 days', '1 - 5 days'];
    expl = `Depending on the specific variety and climate, ${crop} matures in roughly 90 - 150 days.`;
  }
  
  options = options.sort(() => Math.random() - 0.5);
  
  newQuestions.push({
    id: `gen_${idCounter++}`,
    question: qText,
    options: options,
    answer: ans,
    category: cat,
    difficulty: diff,
    explanation: expl
  });
}

const merged = [...original, ...newQuestions];

const fileContent = `const QUIZ_QUESTIONS = ${JSON.stringify(merged, null, 2)};\n\nmodule.exports = QUIZ_QUESTIONS;\n`;
fs.writeFileSync(path.join(__dirname, '../data/quizQuestions.js'), fileContent);
console.log('Successfully generated and merged 10000 questions! Total:', merged.length);
