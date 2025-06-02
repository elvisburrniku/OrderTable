import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const faqData = [
  {
    question: "What is easyTable?",
    answer: "easyTable is a comprehensive restaurant reservation system that helps restaurants manage bookings, reduce no-shows, and provide seamless customer experiences across multiple platforms."
  },
  {
    question: "What are the benefits of an online table booking system?",
    answer: "Online booking systems increase efficiency, reduce phone calls, minimize no-shows, provide customer data insights, and allow 24/7 booking availability for your guests."
  },
  {
    question: "What does an online table booking system cost?",
    answer: "Our pricing starts at €51/month and varies based on your restaurant's size and needs. Contact us for a personalized quote."
  },
  {
    question: "Can I manage multiple restaurant locations?",
    answer: "Yes, easyTable supports multi-location management with centralized control and location-specific customization options."
  },
  {
    question: "How do I get started with the easyTable system?",
    answer: "Simply start your free trial, and our team will guide you through setup, integration, and training to ensure a smooth transition."
  },
  {
    question: "Can I integrate the easyTable online table booking system with my existing systems?",
    answer: "Yes, easyTable integrates with most POS systems, websites, and popular restaurant management tools. Our team assists with setup."
  },
  {
    question: "On which devices can easyTable's online table booking system be used?",
    answer: "easyTable works on any device with internet access - computers, tablets, smartphones, and can be integrated into your website."
  },
  {
    question: "How does easyTable secure customer data and GDPR?",
    answer: "We are fully GDPR compliant with enterprise-level security, data encryption, and transparent data handling policies. Your data remains your data."
  }
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-16 bg-gray-50" id="faq">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-brand-dark mb-12">FAQ</h2>
        
        <div className="space-y-4">
          {faqData.map((faq, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border">
              <button 
                className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition"
                onClick={() => toggleFAQ(index)}
              >
                <span className="font-medium text-brand-dark">{faq.question}</span>
                {openIndex === index ? (
                  <Minus className="text-red-500 w-5 h-5" />
                ) : (
                  <Plus className="text-red-500 w-5 h-5" />
                )}
              </button>
              {openIndex === index && (
                <div className="px-6 pb-4 text-gray-600">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
