"use client";

import { SignUp } from "@clerk/nextjs";
import { useState } from "react";

export default function SignUpPage() {
  const [step, setStep] = useState<"account" | "payment">("account");
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("monthly");

  const handleCouponApply = () => {
    if (couponCode.toUpperCase() === "ARTIOS") {
      setCouponApplied(true);
      setCouponError("");
    } else {
      setCouponError("Invalid coupon code");
      setCouponApplied(false);
    }
  };

  const handleAccountCreated = () => {
    // This would be triggered after Clerk account creation
    // For now, we'll trigger it manually for demo
    setStep("payment");
  };

  if (step === "account") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Start Your Free Trial</h1>
            <p className="text-gray-600">7 days free • Then $9.99/month</p>
          </div>
          <SignUp
            forceRedirectUrl="/sign-up?step=payment"
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "shadow-xl",
              },
            }}
          />
          <div className="mt-4 text-center">
            <button
              onClick={handleAccountCreated}
              className="text-sm text-indigo-600 hover:text-indigo-700 underline"
            >
              Already created account? Continue to payment
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Plan</h1>
          <p className="text-gray-600">7 days free, cancel anytime</p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Plan Selection */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Select Billing Period</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Monthly Plan */}
              <button
                onClick={() => setSelectedPlan("monthly")}
                className={`p-6 border-2 rounded-lg text-left transition ${
                  selectedPlan === "monthly"
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-900">Monthly</h3>
                  {selectedPlan === "monthly" && (
                    <span className="text-indigo-600">✓</span>
                  )}
                </div>
                <div className="mb-2">
                  <span className={`text-3xl font-bold ${couponApplied ? "line-through text-gray-400" : "text-gray-900"}`}>
                    $9.99
                  </span>
                  <span className="text-gray-600">/month</span>
                </div>
                {couponApplied && (
                  <div className="mb-2">
                    <span className="text-3xl font-bold text-green-600">FREE</span>
                  </div>
                )}
                <p className="text-sm text-gray-600">Billed monthly</p>
              </button>

              {/* Annual Plan */}
              <button
                onClick={() => setSelectedPlan("annual")}
                className={`p-6 border-2 rounded-lg text-left transition relative ${
                  selectedPlan === "annual"
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="absolute -top-3 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  SAVE 20%
                </div>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-900">Annual</h3>
                  {selectedPlan === "annual" && (
                    <span className="text-indigo-600">✓</span>
                  )}
                </div>
                <div className="mb-2">
                  <span className={`text-3xl font-bold ${couponApplied ? "line-through text-gray-400" : "text-gray-900"}`}>
                    $95.99
                  </span>
                  <span className="text-gray-600">/year</span>
                </div>
                {couponApplied && (
                  <div className="mb-2">
                    <span className="text-3xl font-bold text-green-600">FREE</span>
                  </div>
                )}
                <p className="text-sm text-gray-600">$7.99/month when billed annually</p>
              </button>
            </div>
          </div>

          {/* Coupon Code */}
          <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <label className="block font-semibold text-gray-900 mb-2">
              Have a coupon code?
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase());
                  setCouponError("");
                }}
                placeholder="Enter code"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase"
                disabled={couponApplied}
              />
              <button
                onClick={handleCouponApply}
                disabled={couponApplied || !couponCode}
                className={`px-6 py-2 rounded-lg font-semibold transition ${
                  couponApplied
                    ? "bg-green-600 text-white cursor-default"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                }`}
              >
                {couponApplied ? "Applied ✓" : "Apply"}
              </button>
            </div>
            {couponError && (
              <p className="text-sm text-red-600 mt-2">{couponError}</p>
            )}
            {couponApplied && (
              <p className="text-sm text-green-600 mt-2 font-semibold">
                Coupon "ARTIOS" applied - Your account is FREE!
              </p>
            )}
          </div>

          {/* Payment Method (Mock UI - Stripe will replace this) */}
          {!couponApplied && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Method</h2>

              {/* Mock Stripe Card Element */}
              <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-600 mb-4">
                  Stripe payment integration will go here
                </p>

                {/* Mock card inputs */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Card Number
                    </label>
                    <div className="px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-400">
                      •••• •••• •••• ••••
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expiry
                      </label>
                      <div className="px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-400">
                        MM / YY
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CVC
                      </label>
                      <div className="px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-400">
                        •••
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-3">
                  Mock UI - Will integrate with Stripe Elements
                </p>
              </div>
            </div>
          )}

          {/* Trial Info */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">Your 7-Day Free Trial</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Full access to all features for 7 days</li>
              <li>✓ {couponApplied ? "Free forever with ARTIOS coupon" : "Cancel anytime during trial, no charge"}</li>
              {!couponApplied && (
                <li>✓ After trial: ${selectedPlan === "monthly" ? "9.99/month" : "95.99/year"}</li>
              )}
            </ul>
          </div>

          {/* Submit Button */}
          <button
            onClick={() => {
              // TODO: Integrate with Stripe and Convex
              // For now, redirect to events page
              window.location.href = "/events";
            }}
            className="w-full py-4 bg-indigo-600 text-white rounded-lg font-bold text-lg hover:bg-indigo-700 transition"
          >
            {couponApplied ? "Start Using Our Daily Family" : "Start 7-Day Free Trial"}
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            By continuing, you agree to our Terms of Service and Privacy Policy.
            {!couponApplied && " Your card will not be charged during the trial period."}
          </p>
        </div>

        {/* Back to Account */}
        <div className="mt-4 text-center">
          <button
            onClick={() => setStep("account")}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to account creation
          </button>
        </div>
      </div>
    </div>
  );
}
