# TypeScript Type Import Fix

## Issue

The build process was failing with the following TypeScript errors:

```
src/context/ThemeProvider.tsx:1:31 - error TS1484: 'ReactNode' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled.

1 import { useState, useEffect, ReactNode } from 'react';
                                ~~~~~~~~~

src/context/ThemeProvider.tsx:2:24 - error TS1484: 'Theme' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled.

2 import { ThemeContext, Theme } from './ThemeContext';
                         ~~~~~
```

## Cause

The project is using TypeScript with `verbatimModuleSyntax` enabled, which requires type imports to be explicitly marked as type-only imports using the `type` keyword. This feature helps distinguish between values and types at the import level, which is particularly useful for bundlers and transpilers.

In the ThemeProvider.tsx file, we were importing types (ReactNode, Theme) as if they were values, which is not allowed when `verbatimModuleSyntax` is enabled.

## Solution

Modified the import statements in ThemeProvider.tsx to use type-only imports:

Before:
```typescript
import { useState, useEffect, ReactNode } from 'react';
import { ThemeContext, Theme } from './ThemeContext';
```

After:
```typescript
import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ThemeContext } from './ThemeContext';
import type { Theme } from './ThemeContext';
```

This separates the value imports (useState, useEffect, ThemeContext) from the type imports (ReactNode, Theme) by using the `type` keyword for type-only imports.

## Verification

After making these changes, the build process completed successfully without any TypeScript errors.

## Additional Information

When using TypeScript with `verbatimModuleSyntax` enabled, always use the `type` keyword when importing types:

```typescript
// Correct way to import types
import type { SomeType } from 'some-module';

// Correct way to import values
import { someValue } from 'some-module';

// Correct way to import both types and values
import { someValue } from 'some-module';
import type { SomeType } from 'some-module';
```

This ensures that types are properly distinguished from values during the build process.
