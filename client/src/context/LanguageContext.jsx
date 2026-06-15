import React, { createContext, useState, useContext } from 'react';

const LanguageContext = createContext();

const translations = {
  en: {
    heroTitle: 'Modern Farming, Shared Abundance',
    heroSubtitle: 'Rent premium agricultural machinery, buy high-yield seeds/fertilizers, sell crops directly, and receive real-time AI agricultural advisory.',
    searchPlaceholder: 'Search for tractors, crops, seeds...',
    voiceSearchTip: 'Tip: Click the microphone icon to search with voice commands!',
    featuredTools: 'Featured Equipment Rentals',
    featuredToolsSub: 'High-performance farming machinery listed by certified local owners.',
    howItWorks: 'How It Works',
    successStories: 'Farmer Success Stories',
    faq: 'Frequently Asked Questions',
    footerRights: 'All Rights Reserved.',
    rentNow: 'Rent Now',
    buyNow: 'Buy Now',
    sellCrop: 'Sell Crop',
    diseaseDetect: 'Disease Detector',
    pricePredict: 'Price Predictor',
    aiAssistant: 'AI Agronomist',
    dailyQuiz: 'Daily Quiz',
    leaderboard: 'Leaderboard',
    nearbyEquip: 'Nearby Machinery Discovery'
  },
  hi: {
    heroTitle: 'आधुनिक खेती, साझा समृद्धि',
    heroSubtitle: 'प्रीमियम कृषि उपकरण किराए पर लें, उच्च उपज वाले बीज और जैविक खाद खरीदें, फसलें बेचें, और तुरंत एआई कृषि सलाह प्राप्त करें।',
    searchPlaceholder: 'ट्रैक्टर, कल्टीवेटर, बीज की खोज करें...',
    voiceSearchTip: 'सुझाव: आवाज के माध्यम से खोजने के लिए माइक आइकन पर क्लिक करें!',
    featuredTools: 'विशेष किराए के उपकरण',
    featuredToolsSub: 'प्रमाणित स्थानीय मालिकों द्वारा सूचीबद्ध उच्च गुणवत्ता वाली कृषि मशीनरी।',
    howItWorks: 'यह कैसे काम करता है',
    successStories: 'किसानों की सफलता की कहानियां',
    faq: 'अक्सर पूछे जाने वाले प्रश्न',
    footerRights: 'सर्वाधिकार सुरक्षित।',
    rentNow: 'किराए पर लें',
    buyNow: 'अभी खरीदें',
    sellCrop: 'फसल बेचें',
    diseaseDetect: 'रोग पहचान',
    pricePredict: 'मंडी भाव अनुमान',
    aiAssistant: 'एआई कृषि मित्र',
    dailyQuiz: 'दैनिक प्रश्नोत्तरी',
    leaderboard: 'रैंकिंग सूची',
    nearbyEquip: 'नज़दीकी उपकरण खोजें'
  },
  hinglish: {
    heroTitle: 'Modern Farming, Shared Abundance',
    heroSubtitle: 'Machinery rent par lein, seed aur fertilizer kharidein, crop direct bechein aur expert AI farming advice payein.',
    searchPlaceholder: 'Tractor, seeds, fertilizers search karein...',
    voiceSearchTip: 'Tip: Voice commands se search karne ke liye mic click karein!',
    featuredTools: 'Featured Rental Equipment',
    featuredToolsSub: 'Certified local owners ke high-quality machinery rentals.',
    howItWorks: 'Yeh Kaise Kaam Karta Hai',
    successStories: 'Kisaano Ki Success Stories',
    faq: 'FAQs aur Help',
    footerRights: 'Sabh Adhikar Surakshit Hain.',
    rentNow: 'Rent Pe Lein',
    buyNow: 'Abhi Buy Karein',
    sellCrop: 'Crop Bechein',
    diseaseDetect: 'Disease Scanner',
    pricePredict: 'Price Predictor',
    aiAssistant: 'AI Agronomist',
    dailyQuiz: 'Daily Quiz Game',
    leaderboard: 'Leaderboard Board',
    nearbyEquip: 'Nearby Machinery Map'
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');

  const t = (key) => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
