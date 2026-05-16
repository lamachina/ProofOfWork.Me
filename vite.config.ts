import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { prodProofApiProxy } from "./test-api/prodApiProxy";

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (id.includes("react") || id.includes("react-dom")) {
            return "react";
          }

          if (
            id.includes("bitcoinjs-lib") ||
            id.includes("bip322-js") ||
            id.includes("@bitcoinerlab") ||
            id.includes("ecpair") ||
            id.includes("tiny-secp256k1") ||
            id.includes("bip")
          ) {
            return "bitcoin";
          }

          if (id.includes("lucide-react")) {
            return "icons";
          }

          return "vendor";
        },
      },
    },
  },
  plugins: [react()],
  server: {
    proxy: prodProofApiProxy(),
  },
});
