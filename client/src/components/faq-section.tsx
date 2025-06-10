import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";

const faqData = [
  {
    question: "What is ReadyTable?",
    answer: "ReadyTable is a comprehensive restaurant reservation system that helps you manage bookings, reduce no-shows, and streamline your restaurant operations."
  },
  {
    question: "What are the benefits of an online table booking system?",
    answer: "Online booking systems reduce no-shows, automate reservation management, improve customer experience, and provide valuable data insights for your business."
  },
  {
    question: "What does an online table booking system cost?",
    answer: "Our pricing starts at €51/month with various plans available depending on your restaurant size and needs. Contact us for a customized quote."
  },
  {
    question: "Can I manage multiple restaurant locations?",
    answer: "Yes, ReadyTable supports multi-location management with centralized dashboard and location-specific settings for each restaurant."
  },
  {
    question: "How do I get started with the ReadyTable system?",
    answer: "Simply sign up for a free trial, and our team will help you set up and configure the system for your restaurant's specific needs."
  },
  {
    question: "Can I integrate the ReadyTable online table booking system with my existing systems?",
    answer: "Yes, ReadyTable integrates with most POS systems, payment processors, and marketing tools to ensure seamless operations."
  },
  {
    question: "On which devices can ReadyTable's online table booking system be used?",
    answer: "ReadyTable works on any device with an internet connection - computers, tablets, smartphones, and mobile devices with full responsive design."
  },
  {
    question: "How does ReadyTable secure customer data and GDPR?",
    answer: "ReadyTable is fully GDPR compliant with enterprise-grade security, encrypted data storage, and you maintain 100% ownership of your customer data."
  }
];

export default function FAQSection() {
  const [openItems, setOpenItems] = useState<number[]>([]);

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <section className="py-16 bg-gray-50" id="faq">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-gray-900 text-center mb-12">FAQ</h2>
        <div className="space-y-4">
          {faqData.map((item, index) => (
            <Card key={index} className="bg-white shadow-sm">
              <Button
                variant="ghost"
                className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 rounded-lg h-auto"
                onClick={() => toggleItem(index)}
              >
                <span className="font-semibold text-gray-900 text-left">{item.question}</span>
                {openItems.includes(index) ? (
                  <Minus className="text-red-500 h-5 w-5 flex-shrink-0" />
                ) : (
                  <Plus className="text-red-500 h-5 w-5 flex-shrink-0" />
                )}
              </Button>
              {openItems.includes(index) && (
                <CardContent className="px-6 pb-4">
                  <p className="text-gray-600">{item.answer}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
