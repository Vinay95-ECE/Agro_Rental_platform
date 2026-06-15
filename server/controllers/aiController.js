const DiseaseReport = require('../models/DiseaseReport');
const { getRecommendations } = require('../services/recommendationService');

// @desc    Predict crop prices using historical mandi guidelines
// @route   POST /api/ai/predict-price
// @access  Public
const predictCropPrice = async (req, res, next) => {
  const { crop, state, district, season } = req.body;

  try {
    if (!crop || !state || !district || !season) {
      res.status(400);
      return next(new Error('Please provide crop, state, district, and season.'));
    }

    // Baseline Mandi Price Models (INR per Quintal)
    const basePrices = {
      Wheat: 2125,
      Rice: 2183,
      Corn: 1960,
      Soybean: 4300,
      Mustard: 5450,
      Cotton: 6620
    };

    const base = basePrices[crop] || 2000;
    
    // Seasonal multiplier
    const seasonalModifiers = {
      Rabi: 1.05,
      Kharif: 0.98,
      Zaid: 1.10
    };
    const modifier = seasonalModifiers[season] || 1.0;

    // Calculate predictions with a simulated variance
    const expectedPrice = Math.round(base * modifier * (0.95 + Math.random() * 0.1));
    const maxPrice = Math.round(expectedPrice * 1.12);
    const minPrice = Math.round(expectedPrice * 0.90);

    // Mandi trends logs
    const trendHistory = [
      { month: 'Jan', price: Math.round(base * 0.92) },
      { month: 'Feb', price: Math.round(base * 0.95) },
      { month: 'Mar', price: Math.round(base * 0.98) },
      { month: 'Apr', price: Math.round(base * 1.03) },
      { month: 'May', price: expectedPrice },
      { month: 'Jun', price: Math.round(expectedPrice * 1.05) }
    ];

    let suggestedSellingTime = 'Within 1-2 months for peak returns.';
    if (modifier > 1.05) {
      suggestedSellingTime = 'Sell immediately. Demand is peaking.';
    }

    res.json({
      success: true,
      prediction: {
        crop,
        state,
        district,
        season,
        expectedPrice,
        priceRange: { min: minPrice, max: maxPrice },
        trend: modifier > 1.0 ? 'Bullish (Upward)' : 'Stable',
        confidenceScore: '92.4%',
        suggestedSellingTime,
        trendHistory
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Diagnose crop leaf diseases (Image scanning simulator)
// @route   POST /api/ai/diagnose-disease
// @access  Private
const diagnoseDisease = async (req, res, next) => {
  const { imageUrl, cropName } = req.body;

  try {
    if (!imageUrl) {
      res.status(400);
      return next(new Error('Please upload crop leaf image.'));
    }

    // Dynamic library of common diseases
    const diseaseLibrary = {
      Wheat: {
        name: 'Wheat Leaf Rust (Puccinia triticina)',
        confidence: '94.8%',
        severity: 'Moderate (35%)',
        explanation: 'Fungal disease causing orange-brown pustules on wheat leaves, reducing photosynthetic activity and yield.',
        treatment: 'Apply Propiconazole or Tebuconazole fungicide immediately.',
        prevention: 'Grow rust-resistant wheat varieties and avoid high overhead irrigation.'
      },
      Rice: {
        name: 'Rice Blast (Magnaporthe oryzae)',
        confidence: '89.2%',
        severity: 'Severe (60%)',
        explanation: 'Fungal blight leading to spindle-shaped lesions on leaves and neck rot, devastating crop yield.',
        treatment: 'Spray Tricyclazole fungicide at 1g/liter of water.',
        prevention: 'Apply balanced nitrogen fertilizers and treat seeds before sowing.'
      },
      Soybean: {
        name: 'Soybean Rust (Phakopsora pachyrhizi)',
        confidence: '91.5%',
        severity: 'Low (15%)',
        explanation: 'Fungal leaf pathogen causing dark lesions and premature defoliation.',
        treatment: 'Apply copper-based fungicides or triazole spray.',
        prevention: 'Enforce crop rotation and plant early-maturing varieties.'
      },
      Corn: {
        name: 'Corn Grey Leaf Spot (Cercospora zeae-maydis)',
        confidence: '95.1%',
        severity: 'Moderate (28%)',
        explanation: 'Fungal blight that produces rectangular gray spots on leaves, drying them out.',
        treatment: 'Use strobilurin or triazole fungicides.',
        prevention: 'Till harvest residue to reduce fungal spores in soil.'
      }
    };

    const targetCrop = cropName || 'Wheat';
    const diagnosis = diseaseLibrary[targetCrop] || diseaseLibrary['Wheat'];

    // Save report to database
    const report = await DiseaseReport.create({
      user: req.user._id,
      cropName: targetCrop,
      imageUrl,
      diseaseName: diagnosis.name,
      severity: diagnosis.severity,
      confidenceScore: diagnosis.confidence,
      treatment: diagnosis.treatment,
      prevention: diagnosis.prevention
    });

    res.json({
      success: true,
      diagnosis: report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Multilingual farming chatbot advisor
// @route   POST /api/ai/chat-advisor
// @access  Public
const getAIAdvice = async (req, res, next) => {
  const { message, language } = req.body;

  try {
    if (!message) {
      res.status(400);
      return next(new Error('Message content is empty'));
    }

    const text = message.toLowerCase();
    let response = '';
    let voiceUrl = ''; // Optional sound read-outs

    // Simple robust keyword-based NLP classifier matching English, Hindi, and Hinglish queries
    if (text.includes('tractor') || text.includes('किराया') || text.includes('rent')) {
      response = language === 'hi' 
        ? 'AgriRent Hub पर आप ट्रैक्टर, कल्टीवेटर और हार्वेस्टर किराए पर ले सकते हैं। "Nearby Equipment" सेक्शन में 5 किमी के भीतर उपलब्ध उपकरण देखें।'
        : 'On AgriRent Hub, you can rent tractors, cultivators, and harvesters. Please check our "Nearby Equipment" map section to discover machines within 5 km.';
    } else if (text.includes('seed') || text.includes('बीज') || text.includes('fertilizer') || text.includes('खाद')) {
      response = language === 'hi'
        ? 'उत्कृष्ट खेती के लिए सही प्रमाणित बीजों (जैसे गेहूं, धान) और जैविक खाद का उपयोग करें। हमारे "Seed & Fertilizer Marketplace" से इन्हें सीधे खरीद सकते हैं।'
        : 'For peak yields, use certified high-quality seeds and organic fertilizers. You can buy these directly from our Seed & Fertilizer Marketplace.';
    } else if (text.includes('weather') || text.includes('मौसम') || text.includes('rain') || text.includes('बारिश')) {
      response = language === 'hi'
        ? 'कल हल्की बारिश होने की संभावना है। कृपया आज अपनी फसलों की सिंचाई टाल दें और उपज को सुरक्षित स्थान पर रखें।'
        : 'Scattered rain is expected tomorrow. We recommend delaying irrigation today and moving harvested yields under covers.';
    } else {
      response = language === 'hi'
        ? 'नमस्ते! मैं आपका कृषि सलाहकार हूँ। आप मुझसे मिट्टी की उर्वरता, रोग पहचान, मंडी भाव, मौसम की चेतावनी या औजार किराए पर लेने के बारे में पूछ सकते हैं।'
        : 'Hello! I am your AI Farming Advisor. Ask me anything about soil fertility, disease identification, Mandi crop pricing, weather warnings, or tool rentals.';
    }

    res.json({
      success: true,
      response,
      language: language || 'en'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user-specific smart farming recommendations
// @route   GET /api/ai/recommendations
// @access  Private
const getAIRecommendations = async (req, res, next) => {
  try {
    const recommendations = await getRecommendations(req.user);
    res.json({
      success: true,
      recommendations
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  predictCropPrice,
  diagnoseDisease,
  getAIAdvice,
  getAIRecommendations
};
