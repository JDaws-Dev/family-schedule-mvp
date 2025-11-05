// Test if environment variables are accessible
console.log("Environment Variables Check:");
console.log("NEXT_PUBLIC_CONVEX_URL:", process.env.NEXT_PUBLIC_CONVEX_URL ? "✓ Set" : "✗ Missing");
console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? "✓ Set" : "✗ Missing");
console.log("GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET ? "✓ Set" : "✗ Missing");
console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "✓ Set" : "✗ Missing");
console.log("CLERK_SECRET_KEY:", process.env.CLERK_SECRET_KEY ? "✓ Set" : "✗ Missing");
