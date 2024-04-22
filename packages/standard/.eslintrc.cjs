const pkgSpecialRules = {
  'core': {}
}

const createPattern = () => [
  {
    group: ['**/dist', '**/dist/**'],
    message: 'Don not import from dist',
    allowTypeImports: false
  },
  {
    group: ['**/src', '**/src/**'],
    message: 'Don not import from src',
    allowTypeImports: false
  }
]

module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended'
  ],
  ignorePatterns: [
    '**/dist/*'
  ],
  overrides: [
    {
      plugins: ['react', '@typescript-eslint'],
      files: ['*.ts', '*.tsx'],
      rules: {
        '@typescript-eslint/consistent-type-imports': [
          'error',
          { prefer: 'type-imports', disallowTypeAnnotations: false }
        ],
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-namespace': 'off',
        'react/react-in-jsx-scope': 'off',
        // TODO fix start
        '@typescript-eslint/ban-types': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-empty-interface': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/dist', '**/dist/**'],
                message: 'Don not import from dist',
                allowTypeImports: false
              },
              {
                group: ['**/src', '**/src/**'],
                message: 'Don not import from src',
                allowTypeImports: false
              }
            ]
          }
        ],
        // end
      }
    },
    {
      plugins: ['@typescript-eslint'],
      files: ['*.spec.ts'],
      rules: {
        '@typescript-eslint/no-restricted-imports': 'off',
      }
    },
    ...Object.entries(pkgSpecialRules).map(([pkg, rules]) => ({
      files: [`packages/${pkg}/src/**/*.ts`, `packages/${pkg}/src/**/*.tsx`],
      rules: {
        '@typescript-eslint/no-restricted-imports': [
          'error',
          {
            patterns: createPattern(pkg)
          }
        ],
        ...rules
      }
    }))
  ],
  settings: {
    react: {
      version: '18'
    }
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['react', '@typescript-eslint', 'simple-import-sort', 'unused-imports'],
  rules: {
    'no-unused-vars': 'off',
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
      'warn',
      {
        'vars': 'all',
        'varsIgnorePattern': '^_',
        'args': 'after-used',
        'argsIgnorePattern': '^_',
      },
    ],
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
    'semi': ['error', 'never'],
    'quotes': [2, 'single'],
    'camelcase': 'error',
    'keyword-spacing': ['error', { before: true, after: true }],
    'space-before-blocks': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'comma-spacing': ['error', { before: false, after: true }],
    'no-multi-spaces': ['error', {
      ignoreEOLComments: true
    }],
    'block-spacing': 'error',
    'array-bracket-spacing': ['error', 'never'],
    'object-curly-spacing': ['error', 'always'],
    'indent': ['error', 2, {
      SwitchCase: 1,
      VariableDeclarator: 'first',
      // ignore jsx node, template literal expression
      ignoredNodes: ['JSXElement *', 'TemplateLiteral *']
    }],
    'jsx-quotes': ['error', 'prefer-single'],
    'react/prop-types': 'off',
    'react/jsx-indent': ['error', 2],
    'react/jsx-indent-props': ['error', 'first']
  }
}
