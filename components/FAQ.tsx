"use client";

import { useState } from "react";

const faqs = [
  {
    question: "Is my email data safe?",
    answer:
      "Absolutely. We use bank-level encryption and only request read-only access to your email. We never store your actual emails - just the event information we extract. Your privacy is our top priority.",
  },
  {
    question: "How does the free trial work?",
    answer:
      "Sign up with a credit card and use all features free for 7 days. You won't be charged during the trial. After 7 days, your subscription starts at $9.99/month. Cancel anytime with one click.",
  },
  {
    question: "What if it doesn't find all my events?",
    answer:
      "Our system is designed to recognize activity emails from sports leagues, music schools, tutors, and more. You can also manually add events in seconds. We're constantly improving our detection.",
  },
  {
    question: "Can I track multiple kids?",
    answer:
      "Yes! Track as many kids and activities as you need. Everything appears in one organized calendar with color coding for each child.",
  },
  {
    question: "What email providers do you support?",
    answer:
      "We support Gmail and Google Workspace accounts (including custom domain emails like yourname@yourcompany.com that use Gmail). Support for Outlook and other providers is coming soon!",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes, cancel with one click from your account settings. No hassle, no questions asked. You'll keep access until the end of your billing period.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mb-20">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
        Frequently Asked Questions
      </h2>
      <div className="max-w-3xl mx-auto space-y-4">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full px-6 py-5 text-left flex justify-between items-center hover:bg-rose-50 transition-colors"
            >
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 pr-4">
                {faq.question}
              </h3>
              <span
                className={`text-2xl text-rose-600 flex-shrink-0 transition-transform ${
                  openIndex === index ? "rotate-180" : ""
                }`}
              >
                ↓
              </span>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ${
                openIndex === index ? "max-h-96" : "max-h-0"
              }`}
            >
              <p className="px-6 pb-5 text-gray-600 leading-relaxed">
                {faq.answer}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
