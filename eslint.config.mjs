// eslint-config-next@16 ships a native ESLint flat-config array (not the
// older eslintrc-style object), so it's imported directly — no
// FlatCompat/eslintrc bridge needed (that bridge actually crashes here,
// since it expects the legacy shape and this is already flat).
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [...nextCoreWebVitals];

export default eslintConfig;
