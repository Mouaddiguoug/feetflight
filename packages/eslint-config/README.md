# @feetflight/eslint-config

### ESLint

Create an `eslint.config.js` in your app/package:

```javascript
import baseConfig from '@feetflight/eslint-config';

export default [...baseConfig];
```

### Prettier

Create a `prettier.config.js` in your app/package:

```javascript
import prettierConfig from '@feetflight/eslint-config/prettier';

export default prettierConfig;
```

Or extend it with custom settings:

```javascript
import prettierConfig from '@feetflight/eslint-config/prettier';

export default {
  ...prettierConfig,
  printWidth: 120,
};
```

## Package Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write ."
  }
}
```
