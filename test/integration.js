'use strict';
// Startet den Adapter in einer Test-ioBroker-Umgebung (Standard-Test von @iobroker/testing)
const path = require('node:path');
const { tests } = require('@iobroker/testing');

tests.integration(path.join(__dirname, '..'));
