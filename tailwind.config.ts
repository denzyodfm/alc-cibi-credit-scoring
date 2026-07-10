import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#18212f",
        mist: "#f4f7fb",
        alc: {
          green: "#0f766e",
          blue: "#1d4ed8",
          gold: "#c2850c"
        }
      },
      boxShadow: {
        soft: "0 12px 40px rgba(20, 36, 65, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
