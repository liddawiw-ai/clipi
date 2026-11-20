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
const earningsWallet = checkJavaScript('EarningsWalletScreen.js', {jsx: true});
checkJavaScript('components/Store.js', {jsx: true});
checkJavaScript('tests/wallet-safety.test.cjs');
checkJavaScript('functions/index.js');
checkJavaScript('app.config.js');
checkJavaScript('scripts/check-release.cjs');
const imports = app.program.body.filter(x => x.type === 'ImportDeclaration').map(x => x.source.value);
for (const required of ['react', 'react-native', '@react-native-firebase/auth', '@react-native-firebase/firestore']) {
  assert.ok(imports.includes(required), 'Missing required import: ' + required);
}
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const walletImports=earningsWallet.program.body.filter(x=>x.type==='ImportDeclaration').map(x=>x.source.value);
for(const name of walletImports){if(name.startsWith('.')||name.startsWith('node:'))continue;assert.ok(pkg.dependencies[name]||pkg.devDependencies?.[name], 'Undeclared wallet dependency: '+name)}
assert.ok(walletImports.includes('expo-local-authentication'),'Wallet biometric dependency missing');
assert.ok(walletImports.includes('@react-native-firebase/functions'),'Wallet functions dependency missing');
assert.ok(fs.readFileSync('EarningsWalletScreen.js','utf8').includes('authenticateAsync'),'Wallet authentication gate missing');
assert.ok(fs.readFileSync('App.js','utf8').includes("page==='earningsWallet'"),'Wallet navigation missing');
const dependencies = {...pkg.dependencies, ...pkg.devDependencies};
const mediaLoader = app.program.body.find(node => node.type === 'FunctionDeclaration' && node.id.name === 'loadRoomMediaRuntime');
assert.ok(mediaLoader, 'Missing deferred media loader');
const appSource = fs.readFileSync('App.js', 'utf8');
const mediaSource = appSource.slice(mediaLoader.start, mediaLoader.end);
for (const name of ['@livekit/react-native', 'livekit-client']) {
  assert.ok(!imports.includes(name), 'Media dependency must not be imported during startup: ' + name);
  assert.ok(mediaSource.includes("require('" + name + "')"), 'Missing deferred media dependency: ' + name);
  assert.ok(dependencies[name], 'Undeclared media dependency: ' + name);
}
for (const name of imports) {
  if (name.startsWith('.') || name.startsWith('node:')) continue;
  assert.ok(dependencies[name], 'Undeclared direct dependency: ' + name);
}
const configured = require('../app.config.js').expo;
assert.equal(configured.extra.eas.projectId, '8b7b92e2-ebd2-48a4-a617-16b83bc83449');
assert.equal(configured.android.package, 'com.walid.clipi');
assert.equal(configured.ios.bundleIdentifier, 'com.walid.clipi');
assert.equal(configured.android.versionCode, 8, 'Android release versionCode must be 8');
assert.equal(configured.ios.buildNumber, '1', 'iOS build number must be explicit');
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
