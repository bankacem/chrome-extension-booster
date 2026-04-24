import * as yaml from 'js-yaml';
const content = `id: 05ad94e2-9996-4c3b-b9c9-f6c67bcb3b28
title: >-
  lemur browser vs kiwi browser: A Comprehensive Comparison for Enhanced
  Browsing Experience
slug: >-
  lemur-browser-vs-kiwi-browser-a-comprehensive-comparison-for-enhanced-browsing-experience-mmthov1pg80`;

const data = yaml.load(content);
console.log('Parsed slug:', data.slug);
