const fs = require('fs');
const path = require('path');
const { parse } = require('@vue/compiler-sfc');
const axios = require('axios');
const crypto = require('crypto');

function requireIfExists(path) {
  if (fs.existsSync(path)) {
    return require(path);
  } else {
    return {};
  }
}

const commonData = requireIfExists('./common.json');

// 1. 设置项目路径和扩展名
const projectPath = './src/views/';
const fileExtensions = ['.vue', '.ts', '.tsx'];
const outputFileName = 'i18n.json';
const outputAllKeysName = 'allChinese.json';
// /[\u4e00-\u9fa5]+/g;
// const pattern = /(?<!\/\/.*)[一-龥]+([一-龥\d\s.,?。]*[一-龥]+)*[.,?。]*/g;
const pattern =
  /(?<!\/\/.*)[一-龥]+([一-龥\d\s.,?？。！，、（）!\(\):：]*[一-龥]+)*[.,?？。！，、（）!\(\)：:]*/g;
const insertCode = `
  import { useI18n } from '/@/hooks/web/useI18n';
  const { t } = useI18n();`;
const templateT = '$t';
const jsT = 't';
// 存储扫描到的中文键值对
const translations = {
  en: {},
  zh: {},
};
let allKeys = {};

// 2. 设置百度翻译 API 的配置
const baiduTranslateConfig = {
  appId: '',
  appKey: '',
  url: 'http://api.fanyi.baidu.com/api/trans/vip/translate',
};

// 2. 遍历项目文件
function scanFiles(directory, fn) {
  const files = fs.readdirSync(directory);
  files.forEach((file) => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      scanFiles(filePath);
    } else if (stats.isFile() && fileExtensions.includes(path.extname(file))) {
      fn(filePath);
    }
  });
}

function processFile(filePath) {
  let fileContent = fs.readFileSync(filePath, 'utf-8');

  // 4. 解析 Vue 文件
  if (filePath.endsWith('.vue')) {
    const { descriptor } = parse(fileContent);
    if (descriptor && descriptor.template && descriptor.template.content) {
      let templateContent = descriptor.template.content;
      const chineseMatches = templateContent.match(pattern);
      if (chineseMatches) {
        // 1. 移除属性中的中文内容
        templateContent = scanAndReplaceChineseInAttribute(templateContent, pattern, filePath);

        // 2. 移除标签中的中文内容
        templateContent = scanAndReplaceChineseInTag(templateContent, pattern, filePath);

        // 3. 移除 JavaScript 上下文中的中文内容
        templateContent = scanAndReplaceChineseInJSContext(
          templateContent,
          pattern,
          true,
          filePath,
        );
        descriptor.template.content = templateContent;
        const updatedFileContent = `<template>\n${descriptor.template.content}\n</template>`;

        fileContent = fileContent.replace(/<template>[\s\S]*<\/template>/, updatedFileContent);
      }
      fileContent = scanAndReplaceChineseInJSContext(fileContent, pattern, false, filePath);
      fileContent = addCodeAfterLastImport(fileContent, insertCode);
    }
  }

  // 5. 解析 TypeScript/JSX 文件
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    const chineseMatches = fileContent.match(pattern);

    if (chineseMatches) {
      for (const chineseText of chineseMatches) {
        const i18nKey = generateI18nKey(chineseText, filePath);

        fileContent = scanAndReplaceChineseInJSContext(fileContent, pattern, false, filePath);
        if (!commonData[chineseText]) {
          translations['zh'][i18nKey] = chineseText;
          translations['en'][i18nKey] = allKeys[chineseText];
        }
      }
      //插入 usei18n 引入
      fileContent = addCodeAfterLastImport(fileContent, insertCode);
    }
  }

  // 6. 保存更新后的文件内容
  fs.writeFileSync(filePath, fileContent, 'utf-8');
}

//7. 执行扫描
scanFiles(projectPath, scanCodeFile);
translateObjectValuesInBatch(allKeys).then((res) => {
  allKeys = res;
  saveKeys(outputAllKeysName);
  scanFiles(projectPath, processFile);
  // 8. 将中文键值对保存为 i18n 可用的 JSON 文件
  fs.writeFileSync(outputFileName, JSON.stringify(translations, null, 2), 'utf-8');
});

// 生成纯英文的随机键值
function generateI18nKey(key, filePath) {
  if (commonData[key]) {
    return `common.${commonData[key]}`;
  }
  if (allKeys[key]) {
    let prefix = getPathPrefix(filePath);
    let i18nKey = allKeys[key].toLowerCase();
    return `${prefix}.${convertToCamelCase(i18nKey)}`;
  }

  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let i18nkey = '';

  for (let i = 0; i < 10; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    i18nkey += characters[randomIndex];
  }

  return `i18n.app.${i18nkey}`;
}

function convertToCamelCase(str) {
  let allWords = str.split(/\s+|,|\'s/g);
  let words = allWords.slice(0, 5);
  let camelCaseWords = words.map((word, index) => {
    if (index === 0) {
      return word.toLowerCase();
    } else {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
  });

  let truncatedCamelCase = camelCaseWords.join('');
  if (allWords.length > 5) {
    truncatedCamelCase += 'Info';
  }
  return truncatedCamelCase;
}

//9 替换属性中的中文文本
function scanAndReplaceChineseInAttribute(template, chineseRegex, filePath) {
  // const chineseRegex = /[\u4e00-\u9fa5]+/g; // 匹配中文字符的正则表达式
  const attributeRegex = /(\s+)(?!:)(\w+)\s*=\s*"([^"]*[\u4e00-\u9fa5]+[^"]*)"/g; // 匹配值中含有中文的属性的正则表达式

  return template.replace(attributeRegex, (match, empty, attributeName, attributeValue) => {
    const replacedValue = attributeValue.replace(chineseRegex, (chineseText) => {
      const i18nKey = generateI18nKey(chineseText, filePath);
      if (!commonData[chineseText]) {
        translations['zh'][i18nKey] = chineseText;
        translations['en'][i18nKey] = allKeys[chineseText];
      }
      return `${templateT}('${i18nKey}')`;
    });

    return `${empty}:${attributeName}="${replacedValue}"`;
  });
}

//10 替换tag中的中文文本
function scanAndReplaceChineseInTag(template, chineseRegex, filePath) {
  // const chineseRegex = /[\u4e00-\u9fa5]+/g; // 匹配中文字符的正则表达式
  const tagRegex = />([^"]*[\u4e00-\u9fa5]+[^"]*)</g; // 匹配值中含有中文的tag的正则表达式

  return template.replace(tagRegex, (match, tagContent) => {
    if (tagContent.match(/\{.*?\}/g)) {
      // 排除位于 Vue 模板表达式中的文本
      return match;
    } else {
      const replacedValue = tagContent.replace(chineseRegex, (chineseText) => {
        const i18nKey = generateI18nKey(chineseText, filePath);
        if (!commonData[chineseText]) {
          translations['zh'][i18nKey] = chineseText;
          translations['en'][i18nKey] = allKeys[chineseText];
        }
        return `{{${jsT}('${i18nKey}')}}`;
      });

      return `>${replacedValue}<`;
    }
  });
}

//11 替换JS环境中的中文文本，'',"",``之间的中文
function scanAndReplaceChineseInJSContext(template, chineseRegex, isInTemplateTag, filePath) {
  const jsContextRegex = /'([^']*[\u4e00-\u9fa5]+[^']*)'/g; // 匹配值中含有中文的tag的正则表达式

  return template.replace(jsContextRegex, (match, quoteContent) => {
    const replacedValue = quoteContent.replace(chineseRegex, (chineseText) => {
      const i18nKey = generateI18nKey(chineseText, filePath);
      if (!commonData[chineseText]) {
        translations['zh'][i18nKey] = chineseText;
        translations['en'][i18nKey] = allKeys[chineseText] || chineseText;
      }
      if (isInTemplateTag) {
        return `${templateT}('${i18nKey}')`;
      } else {
        return `${jsT}('${i18nKey}')`;
      }
    });
    return replacedValue;
  });
}

async function translateText(text) {
  const { appId, appKey, url } = baiduTranslateConfig;
  const salt = Date.now().toString();
  const sign = MD5(appId + text + salt + appKey).toString(); // 使用 MD5 函数生成签名
  const params = {
    q: text,
    from: 'zh',
    to: 'en',
    appid: appId,
    salt: salt,
    sign: sign,
  };

  try {
    const response = await axios.get(url, { params });
    const translatedText = response.data.trans_result[0].dst;
    return translatedText;
  } catch (e) {
    return '';
  }
}
function MD5(text) {
  return crypto.createHash('md5').update(text).digest('hex');
}

function addCodeAfterLastImport(fileContent, codeToAdd) {
  const importRegex = /import\s+.*\s+from\s+['"].*['"];?/g;
  let match;
  let lastImportPosition = -1;
  if (fileContent.includes(`const { t } = useI18n()`)) {
    return fileContent;
  }

  while ((match = importRegex.exec(fileContent)) !== null) {
    lastImportPosition = importRegex.lastIndex;
  }

  if (lastImportPosition !== -1) {
    const modifiedContent =
      fileContent.slice(0, lastImportPosition) +
      '\n' +
      codeToAdd +
      '\n' +
      fileContent.slice(lastImportPosition);
    return modifiedContent;
  }
  return '\n' + codeToAdd + '\n' + fileContent;
}

function getPathPrefix(pathStr) {
  const paths = pathStr?.split('/') || [];
  const arr = paths.map((path, index) => {
    if (index === paths.length - 1) {
      return path.slice(0, -4);
    }
    return path;
  });
  return arr.slice(2).join('.');
}

// 将翻译对象保存为 JSON 文件
function saveKeys(outputFile) {
  const jsonData = JSON.stringify(allKeys, null, 2);

  fs.writeFileSync(outputFile, jsonData, 'utf-8');

  console.log(`翻译文件已保存至：${outputFile}`);
}

// Helper function to translate all values in the object in a single batch
async function translateObjectValuesInBatch(object) {
  const concatenatedText = Object.values(object).join('____');
  const translatedText = await translateText(concatenatedText);

  if (translatedText) {
    const translatedValues = translatedText.split('____');
    const keys = Object.keys(object);

    for (let i = 0; i < keys.length; i++) {
      object[keys[i]] = translatedValues[i];
    }
    return object;
  }
  return {};
}

// 扫描单个代码文件中的中文文本
async function scanCodeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const matches = content.match(pattern);

  if (matches && matches.length > 0) {
    matches.forEach((match) => {
      allKeys[match] = match;
    });
  }
}
