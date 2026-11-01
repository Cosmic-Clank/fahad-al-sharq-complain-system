import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Flat config doesn't read .eslintignore — generated Prisma client and build output stay out of lint
  { ignores: [".next/**", "node_modules/**", "app/generated/**", "storage-backup/**", "next-env.d.ts", "*.tsbuildinfo"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // `_name` marks a parameter kept only for the caller's signature
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
];

export default eslintConfig;
