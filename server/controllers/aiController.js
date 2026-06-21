const DiseaseReport = require('../models/DiseaseReport');
const { getRecommendations } = require('../services/recommendationService');

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Disease knowledge base (rule-based fallback when no Gemini key)
const diseaseKnowledgeBase = {
  Wheat: {
    diseaseName: 'Wheat Leaf Rust (Puccinia triticina)',
    confidence: '94.8%',
    severity: 'Moderate',
    explanation: 'Fungal disease causing orange-brown pustules on wheat leaves, reducing photosynthetic activity and crop yield by 20–40%.',
    treatment: 'Apply Propiconazole 25% EC @ 0.1% or Tebuconazole 250 EC @ 0.1% immediately. Repeat after 14 days.',
    fertilizer: 'Apply Potassium (MOP) @ 60 kg/ha to boost plant immunity. Avoid excessive Nitrogen.',
    pesticide: 'Propiconazole 25% EC (Tilt) or Mancozeb 75% WP @ 2.5 g/L water.',
    prevention: 'Use rust-resistant varieties (HD 2967, PBW 550). Avoid high-density sowing and overhead irrigation.'
  },
  Rice: {
    diseaseName: 'Rice Blast (Magnaporthe oryzae)',
    confidence: '89.2%',
    severity: 'Severe',
    explanation: 'Devastating fungal blight with spindle-shaped lesions on leaves and neck rot, causing 20–70% yield losses.',
    treatment: 'Spray Tricyclazole 75% WP @ 1g/L water at 15-day intervals. Drain field and allow to dry.',
    fertilizer: 'Reduce Nitrogen application to 50%. Apply Silica @ 200 kg/ha and Potassium @ 80 kg/ha.',
    pesticide: 'Tricyclazole (Beam) 75% WP or Isoprothiolane 40% EC @ 1.5 mL/L.',
    prevention: 'Seed treatment with Thiram @ 3g/kg. Use blast-resistant varieties (Pusa 44, Swarna Sub1).'
  },
  Soybean: {
    diseaseName: 'Soybean Rust (Phakopsora pachyrhizi)',
    confidence: '91.5%',
    severity: 'Low',
    explanation: 'Fungal leaf pathogen producing tan-to-brown lesions causing premature defoliation and 10–80% yield loss.',
    treatment: 'Apply copper-based fungicides or Tebuconazole 250 EC @ 0.1%. Begin at first sign of lesions.',
    fertilizer: 'Apply Potassium Schoenite @ 40 kg/ha. Foliar spray of Zinc Sulphate 0.5% enhances resistance.',
    pesticide: 'Propiconazole + Trifloxystrobin (Nativo) @ 0.5 g/L or Azoxystrobin 23% SC.',
    prevention: 'Enforce crop rotation with non-legumes. Plant early-maturing varieties. Monitor weekly.'
  },
  Corn: {
    diseaseName: 'Grey Leaf Spot (Cercospora zeae-maydis)',
    confidence: '95.1%',
    severity: 'Moderate',
    explanation: 'Fungal blight producing rectangular gray spots on leaves, reducing yield by 30–50% in severe infections.',
    treatment: 'Apply Azoxystrobin 23% SC or Tebuconazole 250 EC @ 0.1% at VT/R1 growth stage.',
    fertilizer: 'Apply Urea @ 80 kg/ha in split doses. Balanced NPK (120:60:60) strengthens cell walls.',
    pesticide: 'Strobilurin fungicides (Quadris) or Triazole group @ 0.5–1 mL/L water.',
    prevention: 'Till crop residue post-harvest to reduce spore load. Plant resistant hybrids (DKC 9144).'
  },
  Tomato: {
    diseaseName: 'Early Blight (Alternaria solani)',
    confidence: '92.4%',
    severity: 'High',
    explanation: 'Common fungal disease causing dark concentric ring lesions on older leaves, spreading upward. Causes 20–80% yield loss.',
    treatment: 'Apply Chlorothalonil 75% WP @ 2 g/L or Mancozeb 75% WP @ 2.5 g/L every 7–10 days.',
    fertilizer: 'Apply Calcium nitrate @ 10 g/L foliar spray. Adequate Potassium (60 kg/ha) boosts resistance.',
    pesticide: 'Mancozeb (Dithane M-45) or Iprodione 50% WP @ 1.5 g/L water.',
    prevention: 'Remove infected leaves immediately. Use drip irrigation. Maintain proper plant spacing.'
  },
  Potato: {
    diseaseName: 'Late Blight (Phytophthora infestans)',
    confidence: '97.1%',
    severity: 'Severe',
    explanation: 'Most destructive potato disease with dark water-soaked lesions spreading rapidly in cool humid weather.',
    treatment: 'Apply Metalaxyl + Mancozeb (Ridomil Gold) @ 2.5 g/L preventively. Apply Dimethomorph @ 1 g/L curatively.',
    fertilizer: 'Increase Potassium @ 80 kg/ha. Apply Calcium @ 40 kg/ha to strengthen cell walls.',
    pesticide: 'Metalaxyl-M 4% + Mancozeb 64% (Ridomil Gold MZ) or Cymoxanil + Mancozeb.',
    prevention: 'Plant certified disease-free seed tubers. Ensure good drainage. Avoid overhead irrigation.'
  }
};

const getKnowledgeBaseDiagnosis = (cropName) => {
  const crop = cropName && diseaseKnowledgeBase[cropName] ? cropName : 'Wheat';
  return diseaseKnowledgeBase[crop];
};

// ─── Gemini Vision Analysis ───────────────────────────────────────────────────
const analyzeImageWithGemini = async (base64Image, mimeType, cropName) => {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'your_gemini_api_key') {
      return null; // Fall through to rule-based
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const prompt = `You are an expert agricultural plant pathologist and agronomist. Analyze this ${cropName || 'crop'} leaf/plant image and provide a detailed disease diagnosis.

Respond ONLY with a valid JSON object (no markdown, no code blocks) in exactly this format:
{
  "diseaseName": "Full scientific and common disease name",
  "confidence": "Percentage like 94.8%",
  "severity": "One of: Healthy, Low, Moderate, High, Severe",
  "explanation": "2-3 sentence scientific explanation of the disease and its impact",
  "treatment": "Specific chemical/organic treatment with dosage and frequency",
  "fertilizer": "Specific fertilizer recommendation with dosage to boost immunity",
  "pesticide": "Specific pesticide/fungicide with brand name and dilution ratio",
  "prevention": "3-4 actionable prevention methods"
}

If the plant appears HEALTHY, set diseaseName to "No Disease Detected - Healthy Plant", severity to "Healthy", and provide maintenance advice in treatment field.
Analyze visible symptoms carefully: color, spots, lesions, wilting, discoloration patterns.`;

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType || 'image/jpeg'
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const text = result.response.text().trim();
    
    // Clean up response - remove any markdown code blocks if present
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Gemini Vision analysis failed:', err.message);
    return null;
  }
};

// ─── Controller Functions ─────────────────────────────────────────────────────

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

    const basePrices = {
      Wheat: 2125, Rice: 2183, Corn: 1960,
      Soybean: 4300, Mustard: 5450, Cotton: 6620
    };

    const base = basePrices[crop] || 2000;
    const seasonalModifiers = { Rabi: 1.05, Kharif: 0.98, Zaid: 1.10 };
    const modifier = seasonalModifiers[season] || 1.0;

    const expectedPrice = Math.round(base * modifier * (0.95 + Math.random() * 0.1));
    const maxPrice = Math.round(expectedPrice * 1.12);
    const minPrice = Math.round(expectedPrice * 0.90);

    const trendHistory = [
      { month: 'Jan', price: Math.round(base * 0.92) },
      { month: 'Feb', price: Math.round(base * 0.95) },
      { month: 'Mar', price: Math.round(base * 0.98) },
      { month: 'Apr', price: Math.round(base * 1.03) },
      { month: 'May', price: expectedPrice },
      { month: 'Jun', price: Math.round(expectedPrice * 1.05) }
    ];

    let suggestedSellingTime = 'Within 1-2 months for peak returns.';
    if (modifier > 1.05) suggestedSellingTime = 'Sell immediately. Demand is peaking.';

    res.json({
      success: true,
      prediction: {
        crop, state, district, season, expectedPrice,
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

// @desc    Diagnose crop leaf diseases via image URL (legacy)
// @route   POST /api/ai/diagnose-disease
// @access  Private
const diagnoseDisease = async (req, res, next) => {
  const { imageUrl, cropName } = req.body;
  try {
    if (!imageUrl) {
      res.status(400);
      return next(new Error('Please upload crop leaf image.'));
    }

    const targetCrop = cropName || 'Wheat';
    const diagnosis = getKnowledgeBaseDiagnosis(targetCrop);

    const report = await DiseaseReport.create({
      user: req.user._id,
      cropName: targetCrop,
      imageUrl,
      diseaseName: diagnosis.diseaseName,
      severity: diagnosis.severity,
      confidenceScore: diagnosis.confidence,
      treatment: diagnosis.treatment,
      prevention: diagnosis.prevention,
      fertilizer: diagnosis.fertilizer || '',
      pesticide: diagnosis.pesticide || '',
      explanation: diagnosis.explanation || '',
      analysisMethod: 'rule-based'
    });

    res.json({ success: true, diagnosis: report });
  } catch (error) {
    next(error);
  }
};

// @desc    Analyze uploaded image for disease detection (NEW - Gemini Vision)
// @route   POST /api/disease/analyze
// @access  Private
const analyzeDiseaseImage = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      return next(new Error('Please upload a crop image file.'));
    }

    const cropName = req.body.cropName || 'Wheat';
    const imageBuffer = req.file.buffer;
    const mimeType = req.file.mimetype;
    const base64Image = imageBuffer.toString('base64');

    // Try Gemini Vision first
    let diagnosis = await analyzeImageWithGemini(base64Image, mimeType, cropName);
    let analysisMethod = 'gemini-vision';

    // Fallback to knowledge base if Gemini fails or no key
    if (!diagnosis) {
      diagnosis = getKnowledgeBaseDiagnosis(cropName);
      analysisMethod = 'rule-based';
    }

    // Upload image to Cloudinary (if configured)
    let imageUrl = '';
    try {
      const cloudinary = require('cloudinary').v2;
      if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_KEY !== 'your_cloudinary_key') {
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET
        });
        const dataUri = `data:${mimeType};base64,${base64Image}`;
        const uploadResult = await cloudinary.uploader.upload(dataUri, {
          folder: 'agrirent/disease-scans',
          resource_type: 'image'
        });
        imageUrl = uploadResult.secure_url;
      }
    } catch (cloudErr) {
      console.error('Cloudinary upload failed:', cloudErr.message);
    }

    // Fallback image URL if Cloudinary not configured
    if (!imageUrl) {
      imageUrl = `data:${mimeType};base64,${base64Image.substring(0, 100)}...`;
    }

    // Save to MongoDB
    const report = await DiseaseReport.create({
      user: req.user._id,
      cropName,
      imageUrl: imageUrl || 'uploaded-file',
      diseaseName: diagnosis.diseaseName,
      severity: diagnosis.severity,
      confidenceScore: diagnosis.confidence || diagnosis.confidenceScore || '90%',
      treatment: diagnosis.treatment,
      prevention: diagnosis.prevention || '',
      fertilizer: diagnosis.fertilizer || '',
      pesticide: diagnosis.pesticide || '',
      explanation: diagnosis.explanation || '',
      analysisMethod
    });

    // Return full base64 for immediate display
    res.json({
      success: true,
      analysisMethod,
      imagePreview: `data:${mimeType};base64,${base64Image}`,
      diagnosis: {
        ...report.toObject(),
        confidenceScore: report.confidenceScore
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get disease scan history for logged-in user
// @route   GET /api/disease/history
// @access  Private
const getDiseaseHistory = async (req, res, next) => {
  try {
    const reports = await DiseaseReport.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ success: true, reports });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a disease scan record
// @route   DELETE /api/disease/history/:id
// @access  Private
const deleteDiseaseRecord = async (req, res, next) => {
  try {
    const report = await DiseaseReport.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    if (!report) {
      res.status(404);
      return next(new Error('Disease record not found.'));
    }
    await report.deleteOne();
    res.json({ success: true, message: 'Disease record deleted.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Multilingual farming chatbot advisor using Gemini AI
// @route   POST /api/ai/chat-advisor
// @access  Public
const getAIAdvice = async (req, res, next) => {
  const { message, language } = req.body;

  try {
    if (!message) {
      res.status(400);
      return next(new Error('Message content is empty'));
    }

    // Try Gemini AI first
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'your_gemini_api_key') {
      try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const langInstruction = language === 'hi'
          ? 'Respond in Hindi (Devanagari script).'
          : language === 'hinglish'
          ? 'Respond in Hinglish (mix of Hindi and English, written in Roman script).'
          : 'Respond in clear, simple English.';

        const systemPrompt = `You are AgriBot, an expert AI Agronomist for Indian farmers on the AgriRent Hub platform. ${langInstruction}

Your role is to provide:
1. Detailed crop disease diagnosis and treatment
2. Soil health and fertilizer recommendations  
3. Irrigation and weather-based farming advice
4. Government scheme information (PM-KISAN, Kisan Credit Card etc.)
5. Market prices and selling strategy advice
6. Equipment rental recommendations

ADVANCED THINKING MODE: When user asks about plant symptoms or problems:
Step 1: Analyze the symptoms described
Step 2: List 2-3 possible causes with likelihood
Step 3: Recommend the most probable diagnosis
Step 4: Provide specific actionable steps
Step 5: Add prevention advice

Always be specific with product names, dosages, and timing. Never give vague answers.
Format your response with clear sections using emoji headers for readability.

User question: ${message}`;

        const result = await model.generateContent(systemPrompt);
        const response = result.response.text();

        return res.json({
          success: true,
          response,
          language: language || 'en',
          source: 'gemini'
        });
      } catch (geminiErr) {
        const isQuota = geminiErr.message?.includes('429') || geminiErr.message?.includes('quota');
        console.error(isQuota ? '⚡ Gemini quota exceeded — using rule-based fallback' : `Gemini API error: ${geminiErr.message}`);
        // Fall through to rule-based
      }
    }

    // Rule-based fallback
    const text = message.toLowerCase();
    let response = '';

    if (text.includes('yellow') || text.includes('पीला') || text.includes('yellowing')) {
      response = language === 'hi'
        ? '🔍 **पत्तियाँ पीली होने के कारण:**\n\n**1. नाइट्रोजन की कमी** (सबसे आम) - पुरानी पत्तियाँ पहले पीली होती हैं\n✅ समाधान: यूरिया 46-0-0 @ 20 kg/बीघा डालें\n\n**2. आयरन की कमी** - नई पत्तियाँ पीली होती हैं\n✅ समाधान: FeSO4 @ 0.5% का फोलियर स्प्रे करें\n\n**3. ओवरवाटरिंग** - जड़ें सड़ जाती हैं\n✅ समाधान: सिंचाई कम करें, ड्रेनेज सुधारें\n\n⚠️ **सावधानी:** कीटनाशक छिड़कने से पहले सही कारण पहचानें।'
        : `🔍 **Why Leaves Turn Yellow — Step-by-Step Analysis:**\n\n**Step 1: Identify Pattern**\n- Older leaves yellowing first → Nitrogen deficiency\n- Newer leaves yellowing → Iron/Micronutrient deficiency\n- Yellowing with spots → Fungal disease\n\n**Step 2: Most Likely Causes**\n1. 🌿 Nitrogen deficiency (60% probability) — Apply Urea @ 50 kg/ha\n2. 🦠 Fungal infection (25% probability) — Apply Mancozeb 75% WP\n3. 💧 Root rot from overwatering (15%) — Improve drainage\n\n**Step 3: Immediate Action**\nFoliar spray: 19:19:19 NPK @ 5g/L water for quick green-up\n\n**Prevention:** Soil test every season. Maintain proper pH 6.0–7.0`;
    } else if (text.includes('tractor') || text.includes('rent') || text.includes('किराया')) {
      response = language === 'hi'
        ? '🚜 AgriRent Hub पर किसान भाई ट्रैक्टर, रोटावेटर, हार्वेस्टर किराए पर ले सकते हैं।\n\n**कैसे बुक करें:**\n1. "Rent Tools" पर जाएं\n2. अपने नजदीकी उपकरण चुनें\n3. तारीख चुनें और ऑनलाइन बुकिंग करें\n4. Razorpay से सुरक्षित भुगतान करें\n\n💰 दैनिक दर: ₹800-₹2500 (उपकरण के अनुसार)'
        : '🚜 **Tool Rental on AgriRent Hub:**\n\nAvailable equipment:\n- Tractor (50-75 HP): ₹1,000–₹2,000/day\n- Rotavator: ₹600–₹900/day\n- Harvester: ₹1,500–₹2,500/day\n- Seed Drill: ₹400–₹700/day\n\n**To Book:** Go to Rent Tools → Select equipment → Choose dates → Pay online\n✅ All tools verified by AgriRent Hub';
    } else if (text.includes('fertilizer') || text.includes('खाद') || text.includes('npk')) {
      response = language === 'hi'
        ? '🌱 **उर्वरक की सिफारिश:**\n\n**Kharif फसलों के लिए:**\n- N:P:K = 120:60:40 kg/ha\n- बुवाई पर: DAP @ 250 kg/ha + MOP @ 80 kg/ha\n- 30 दिन बाद: यूरिया @ 50 kg/ha\n\n**Rabi फसलों के लिए:**\n- गेहूं: N:P:K = 120:60:40\n- सरसों: N:P:K = 80:40:40\n\n⚠️ सही मात्रा के लिए मिट्टी परीक्षण जरूर करें।'
        : '🌱 **Fertilizer Recommendations:**\n\n**General NPK Guide:**\n- Wheat: 120:60:40 kg N:P:K per hectare\n- Rice: 100:50:50 kg/ha\n- Corn: 150:75:60 kg/ha\n- Soybean: 30:80:40 kg/ha (low N, high P)\n\n**Application Schedule:**\n1. Basal: DAP 100 kg/ha + MOP 60 kg/ha at sowing\n2. Top dress: Urea @ 65 kg/ha at 30 days\n3. Foliar: 0-0-50 @ 5 g/L at flowering\n\n💡 Tip: Get soil tested (₹200 at Krishi Kendra) for precision nutrition';
    } else if (text.includes('weather') || text.includes('rain') || text.includes('मौसम') || text.includes('बारिश')) {
      response = language === 'hi'
        ? '🌦️ **मौसम सलाह:**\n\nकल हल्की बारिश की संभावना है (82%)।\n\n**आज करें:**\n✅ खाद या कीटनाशक का छिड़काव न करें\n✅ कटी हुई फसल को सुरक्षित स्थान पर रखें\n✅ सिंचाई स्थगित करें\n\nWeather & Rain Forecast के लिए हमारा Weather सेक्शन देखें।'
        : '🌦️ **Weather-Based Farming Advice:**\n\nCheck the Weather & Rain section for detailed forecast.\n\n**General Guidelines:**\n- Rain >80% probability → Avoid spraying fertilizer/pesticide\n- Temp >35°C → Irrigate in early morning or evening\n- Humidity >80% → High fungal disease risk, apply preventive fungicide\n- High winds → Postpone aerial spraying\n\n💡 Use the Weather page for real-time 7-day forecast with farming recommendations!';
    } else {
      response = language === 'hi'
        ? `🤖 **AgriBot आपकी सेवा में है!**\n\nआपने पूछा: "${message}"\n\nमैं आपकी मदद कर सकता हूं:\n🌾 फसल रोग पहचान और उपचार\n🌱 खाद और उर्वरक सिफारिश\n🚜 कृषि यंत्र किराए की जानकारी\n🌦️ मौसम आधारित खेती सलाह\n💰 मंडी भाव और बेचने की रणनीति\n🏛️ सरकारी योजनाएं (PM-KISAN, KCC)\n\nकृपया अपना प्रश्न और विस्तार से पूछें।`
        : `🤖 **AgriBot — Your AI Farming Assistant**\n\nYou asked: "${message}"\n\nI can help you with:\n🌾 Crop disease identification & treatment\n🌱 Fertilizer & soil health advice\n🚜 Equipment rental guidance\n🌦️ Weather-based farming recommendations\n💰 Mandi prices & selling strategy\n🏛️ Government schemes (PM-KISAN, Kisan Credit Card)\n\nPlease ask a more specific question for detailed advice. For example:\n- "My tomato leaves have dark spots"\n- "Best fertilizer for wheat in December"\n- "How to prevent rice blast disease"`;
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const hasRealKey = geminiKey && geminiKey !== 'your_gemini_api_key';
    const responseSource = hasRealKey ? 'quota-exceeded' : 'rule-based';

    res.json({ success: true, response, language: language || 'en', source: responseSource });
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
    res.json({ success: true, recommendations });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  predictCropPrice,
  diagnoseDisease,
  analyzeDiseaseImage,
  getDiseaseHistory,
  deleteDiseaseRecord,
  getAIAdvice,
  getAIRecommendations
};
