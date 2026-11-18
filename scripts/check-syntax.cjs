#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const parser = require('@babel/parser');

function checkJavaScript(filename, options = {}) {
  const source = fs.readFileSync(filename, 'utf8');
  const ast = parser.parse(source, {
    sourceType: 'unambiguous',
    plugins: options.jsx ? ['jsx'] : [],
    errorRecovery: false,
    sourceFilename: filename,
  });
  assert.ok(ast.program.body.length, filename + ': empty or invalid source');
  console.log('PASS syntax: ' + filename + ' (' + ast.program.body.length + ' statements)');
  return ast;
}
const app = checkJavaScript('App.js', {jsx: true});
checkJavaScript('app.config.js');
checkJavaScript('scripts/check-release.cjs');
const imports = app.program.body.filter(x => x.type === 'ImportDeclaration').map(x => x.source.value);
for (const required of ['react', 'react-native', '@react-native-firebase/auth', '@react-native-firebase/firestore', 'expo-camera']) {
  assert.ok(imports.includes(required), 'Missing required import: ' + required);
}
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const dependencies = {...pkg.dependencies, ...pkg.devDependencies};
for (const name of imports) {
  if (name.startsWith('.') || name.startsWith('node:')) continue;
  assert.ok(dependencies[name], 'Undeclared direct dependency: ' + name);
}
const configured = require('../app.config.js').expo;
assert.equal(configured.extra.eas.projectId, '8b7b92e2-ebd2-48a4-a617-16b83bc83449');
assert.equal(configured.android.package, 'com.walid.clipi');
assert.equal(configured.ios.bundleIdentifier, 'com.walid.clipi');
assert.equal(configured.ios.infoPlist.ITSAppUsesNonExemptEncryption,false);
assert.ok(configured.plugins.includes('@react-native-firebase/app'));
assert.ok(configured.plugins.includes('@react-native-firebase/auth'));
const androidFirebase=JSON.parse(fs.readFileSync('google-services.json','utf8'));
const iosFirebase=fs.readFileSync('GoogleService-Info.plist','utf8');
const extractPlistString=(key)=>{
  const pattern=new RegExp('<key>'+key+'</key>\\s*<string>([^<]+)</string>');
  const match=iosFirebase.match(pattern);
  assert.ok(match, 'Missing iOS Firebase config key: '+key);
  return match[1];
};
assert.equal(androidFirebase.project_info.project_id,'clipi-f67c0','Android Firebase project mismatch');
assert.ok(androidFirebase.client.some(c=>c.client_info?.android_client_info?.package_name==='com.walid.clipi'),
  'Android Firebase package mismatch');
assert.equal(extractPlistString('PROJECT_ID'),'clipi-f67c0','iOS Firebase project mismatch');
assert.equal(extractPlistString('BUNDLE_ID'),'com.walid.clipi','iOS Firebase bundle mismatch');
console.log('PASS: Android/iOS Firebase config matches same project and app IDs');
console.log('PASS: App JSX parse, direct dependencies and Expo identifiers');
