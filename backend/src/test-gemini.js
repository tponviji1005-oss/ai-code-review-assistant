import { reviewCode } from "./gemini.js";

const patch = `
+ function add(a, b) {
+   return a+b;
+ }
`;

const review = await reviewCode(patch);

console.log(review);