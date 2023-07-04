const fs = require('fs');
const path = require('path');
const ts = require('typescript');


const inputEnFolder = 'src/locales/lang/en'; // 输入en文件夹，包含所有 JSON 文件
const inputZhFolder = 'src/locales/lang/en'; // 输入zh文件夹，包含所有 JSON 文件
const outputFolder = 'src/'; // 输出文件夹，用于保存合并后的 JSON 文件
const outputEnFile = 'merged_en_keys_ts.json'; // 合并后的 en/JSON 文件名
const outputZhFile = 'merged_zh_keys_ts.json'; // 合并后的 zh/JSON 文件名
let enData;
let zhData;
function getKeySetFromJsonFile(file_path) {
  const content = fs.readFileSync(file_path, 'utf-8');
  const data = JSON.parse(content);
  return new Set(Object.keys(data));
}

function getKeySetFromTsFile(file_path) {
  const content = fs.readFileSync(file_path, 'utf-8');
  const sourceFile = ts.createSourceFile(file_path, content, ts.ScriptTarget.ES2015, true);

  const keys = new Set();
  const stack = [];

  function visit(node) {
    if (node.kind === ts.SyntaxKind.PropertyAssignment && ts.isIdentifier(node.name)) {
      const propertyName = node.name.escapedText.toString();
      const parentProperty = stack[stack.length - 1];

      if (parentProperty) {
        keys.add(`${parentProperty}.${propertyName}`);
      } else {
        keys.add(propertyName);
      }

      stack.push(propertyName);
      ts.forEachChild(node, visit);
      stack.pop();
    } else {
      ts.forEachChild(node, visit);
    }
  }

  ts.forEachChild(sourceFile, visit);

  return keys;
}

function getFilesRecursively(folder_path, file_extension) {
  let files = [];
  const entries = fs.readdirSync(folder_path);
  entries.forEach((entry) => {
    const entry_path = path.join(folder_path, entry);
    const stats = fs.statSync(entry_path);
    if (stats.isDirectory()) {
      files = files.concat(getFilesRecursively(entry_path, file_extension));
    } else if (stats.isFile() && entry_path.endsWith(file_extension)) {
      files.push(entry_path);
    }
  });
  return files;
}

function mergeKeysToJsonFile(folder_path, output_file) {
  const jsonFiles = getFilesRecursively(folder_path, '.json');

  const allKeys = {};
  jsonFiles.forEach((jsonFile) => {
    const keys = getKeySetFromJsonFile(jsonFile);
    const filename = path.basename(jsonFile, '.json');
    keys.forEach((key) => {
      allKeys[`${filename}_${key}`] = true;
    });
  });

  const tsFiles = getFilesRecursively(folder_path, '.ts');
  tsFiles.forEach((tsFile) => {
    const keys = getKeySetFromTsFile(tsFile);
    const filename = path.basename(tsFile, '.ts');
    keys.forEach((key) => {
      allKeys[`${filename}_${key}`] = true;
    });
  });

  const outputData = JSON.stringify(allKeys, null, 2);

  fs.writeFileSync(output_file, outputData, 'utf-8');
  return allKeys;
}

function getKeysFromData(data) {
  return new Set(Object.keys(data));
}

function getMissingKeys(data1, data2) {
  const keys1 = getKeysFromData(data1);
  const keys2 = getKeysFromData(data2);

  const missingKeys = [];

  keys1.forEach((key) => {
    if (!keys2.has(key)) {
      missingKeys.push(key);
    }
  });

  return missingKeys;
}


enData = mergeKeysToJsonFile(inputEnFolder, path.join(outputFolder, outputEnFile));
zhData = mergeKeysToJsonFile(inputZhFolder, path.join(outputFolder, outputZhFile));
const missingKeysInEn = getMissingKeys(enData, zhData);
const missingKeysInZh = getMissingKeys(zhData, enData);
console.log('合并后的 JSON 文件已保存到：', path.join(outputFolder, outputEnFile), path.join(outputFolder, outputZhFile));
console.log('丢失的 key 值：', missingKeysInEn, missingKeysInZh);
