const fs = require("fs");
const path = require("path");

// 定义正则表达式，用于匹配中文字符 /[\u4e00-\u9fff]+/g;
const regex =
  /(?<!\/\/.*)[一-龥]+([一-龥\d\s.,?？。！，、（）!\(\):：]*[一-龥]+)*[.,?？。！，、（）!\(\)：:]*/g;

// 定义要扫描的代码文件路径
const scanPath = "web/src/views/pages/";
const outputFile = "allKeys.json"; // 合并后的 en/JSON 文件名

// 存储扫描结果的对象
const allKeys = {};

// 扫描代码文件中的中文文本
function scanCodeFiles(dir) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // 递归扫描子文件夹
      scanCodeFiles(filePath);
    } else if (stat.isFile()) {
      // 处理代码文件
      if (
        path.extname(filePath) === ".ts" ||
        path.extname(filePath) === ".tsx" ||
        path.extname(filePath) === ".vue"
      ) {
        scanCodeFile(filePath);
      }
    }
  });
}

// 扫描单个代码文件中的中文文本
function scanCodeFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const matches = content.match(regex);

  if (matches && matches.length > 0) {
    matches.forEach((match) => {
      // 生成唯一的 key
      const key = generateKey(match);
      // 将中文文本添加到翻译对象中
      allKeys[key] = match;
    });
  }
}

// 生成唯一的 key，用于作为翻译的键值
function generateKey(text) {
  // 可根据需要自定义生成规则，确保唯一性
  // 这里简单地将中文文本转换为小写并替换空格为下划线
  return text.toLowerCase().replace(/\s/g, "_");
}

// 将翻译对象保存为 JSON 文件
function saveTranslations(outputFile) {
  const jsonData = JSON.stringify(allKeys, null, 2);

  fs.writeFileSync(outputFile, jsonData, "utf-8");

  console.log(`翻译文件已保存至：${outputFile}`);
}

// 开始扫描
scanCodeFiles(scanPath);

// 保存翻译结果为 JSON 文件
saveTranslations(outputFile);
