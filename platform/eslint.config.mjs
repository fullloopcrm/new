import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // eslint-config-next@16 (Next 16.1.6) promoted these rules to errors, which
    // flipped the whole codebase red overnight (lint was error-clean 2026-07-04).
    // Kept as warnings so CI's `eslint src --quiet` stays green and genuinely NEW
    // errors still surface, while the ~680 pre-existing hits are tracked as
    // warnings to burn down over time rather than blocking every deploy.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/static-components": "warn",
      "@next/next/no-html-link-for-pages": "warn",
      "prefer-const": "warn",
      "react/display-name": "warn",
    },
  },
  {
    // Guardrail against the recurring "naive Eastern timestamp double-shifted
    // by an ambient timezone" bug class (see src/lib/naive-time.ts). Chaining
    // a locale-formatting/component-extraction method directly off
    // `new Date(...)` for a start_time/end_time field parses those digits
    // using whatever timezone the calling environment happens to be in
    // (UTC on the server, the viewer's browser on the client) — wrong
    // whenever that isn't exactly the tenant's zone. This has recurred
    // independently in 20+ files; error (not warn) so CI's `eslint src
    // --quiet` actually blocks it instead of letting it slide through.
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/lib/format.ts",
      "src/lib/naive-time.ts",
      "src/lib/recurring.ts",
      "src/lib/tenant-time.ts",
      "src/lib/time-window.ts",
      "src/lib/nycmaid/time-window.ts",
      "src/app/dashboard/calendar/CalendarBoard.tsx",
      "**/*.test.ts",
      "**/*.test.tsx",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.property.name=/^(toLocaleTimeString|toLocaleDateString|toLocaleString|getHours|getUTCHours|getMinutes|getUTCMinutes)$/][callee.object.type='NewExpression'][callee.object.callee.name='Date']:has(MemberExpression[property.name=/^(start_time|end_time)$/])",
          message:
            "start_time/end_time are naive Eastern wall-clock strings — formatting them via new Date(...).toLocale*()/getHours() double-shifts on the server and drifts with the viewer's browser timezone on the client. Use formatNaiveTime/formatNaiveDate/naiveToAnchoredDate from '@/lib/naive-time' for display, or parseNaiveET from '@/lib/recurring' when comparing against a real instant (Date.now(), created_at, check_in_time, etc.).",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
