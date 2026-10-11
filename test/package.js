'use strict';
// Prüft package.json und io-package.json (Standard-Test von @iobroker/testing)
const path = require('node:path');
const { tests } = require('@iobroker/testing');

tests.packageFiles(path.join(__dirname, '..'));
