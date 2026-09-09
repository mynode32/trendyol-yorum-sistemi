import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Bu proje React Compiler kullanmıyor; admin panelindeki standart
      // "mount'ta fetch et, sonuçla state güncelle" deseni bu (yeni, deneysel)
      // kuralın tüm örneklerini hataya çeviriyor. Mimariyi bu tek kural için
      // yeniden yazmak yerine uyarıya düşürüyoruz.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // esbuild ile üretilen widget bundle'ı (kaynak: src/widget/)
    "public/widget/**",
  ]),
]);

export default eslintConfig;
