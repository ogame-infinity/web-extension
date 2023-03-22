module.exports = {
    'env': {
        'browser': true,
        'es2021': true
    },
    'extends': 'eslint:recommended',
    'overrides': [
    ],
    'parserOptions': {
        'ecmaVersion': 'latest',
        'sourceType': 'module'
    },
    'rules': {
        'no-undef': 0,
        'no-unused-vars': 0,
        'no-async-promise-executor': 0,
        'no-empty': 0,
        'no-inner-declarations': 0,
        'no-global-assign': 0,
        'no-prototype-builtins': 0,
        'indent': [
            'error',
            2
        ],
        'linebreak-style': [
            'error',
            'unix'
        ],
        'quotes': [
            'error',
            'double'
        ],
        'semi': [
            'error',
            'always'
        ]
    }
};
