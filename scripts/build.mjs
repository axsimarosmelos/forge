import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const require=createRequire(import.meta.url);
const { marked }=require('marked');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const data=JSON.parse(read('content/curriculum.json'));
const json=JSON.stringify(data).replace(/</g,'\\u003c');
// Only repository-authored Markdown is rendered. Do not feed user Markdown here.
const lesson=marked.parse(read('content/cpp-stl-fast-io.md'),{gfm:true}).replaceAll('href="../templates/', 'href="templates/');
const extension=`<style>${read('frontend/native.css')}</style>\n<script id="native-curriculum" type="application/json">${json}</script>\n<template id="stl-article">${lesson}</template>\n<script>${read('frontend/native.js')}</script>\n`;
let html=read('frontend/base.html').replace("['lab','code','Python lab']","['lab','code','Code lab']");
if(!html.includes('</body>'))throw Error('Base document missing body end.');
html=html.replace('</body>',()=>extension+'</body>');
writeFileSync(resolve(root,'index.html'),html);
console.log(`Built index.html: ${Buffer.byteLength(html)} bytes; ${data.modules.length} modules.`);
