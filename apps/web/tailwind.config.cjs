// CommonJS so it can `require` the shared preset and is not part of the TS program.
const preset = require("@ielts/config/tailwind.preset.cjs");

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [preset],
  content: ["./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"]
};
