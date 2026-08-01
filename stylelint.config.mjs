export default {
  extends: ['stylelint-config-standard'],
  rules: {
    'selector-class-pattern': null,
    'custom-property-pattern': null,
    'declaration-empty-line-before': null,
    'declaration-block-single-line-max-declarations': null,
    'at-rule-empty-line-before': null,
    'rule-empty-line-before': null,
    'color-hex-length': null,
    'value-keyword-case': null,
    'property-no-deprecated': null,
    'property-no-vendor-prefix': [
      true,
      {
        ignoreProperties: [
          '-webkit-box-orient',
          '-webkit-font-smoothing',
          '-webkit-line-clamp',
          '-webkit-tap-highlight-color',
        ],
      },
    ],
    'no-descending-specificity': null,
    'media-feature-range-notation': null,
  },
};
