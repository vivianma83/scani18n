# 前提条件

在运行脚本之前，请确保已经修改相关运行文件里的配置项，包括：
- `inputEnFolder`：英文本地化文件目录路径，比如 "locales/en"。
- `inputZhFolder`：中文本地化文件目录路径，比如 "locales/zh"。
- `outputFolder`：合并后输出文件的目录路径。
- `outputEnFile`：输出的英文本地化文件名。
- `outputZhFile`：输出的中文本地化文件名。

# 使用方法

在运行脚本之前，请确保已经安装了 Node.js，并执行以下命令来安装脚本依赖：

```bash
npm install
```

## 扫描json文件

运行以下命令来执行 scanJsonFile.js 脚本：
```bash
node scanJsonFile.js
```
扫描TS文件

运行以下命令来执行 scanTsFile.js 脚本：
```bash
node scanTsFile.js
```
使用该脚本可以查到i18n丢失项目，保持 en 和 zh key值一致，用于词条数目查漏补缺


## 扫描项目中的中文字符串

```bash
node scanChinese.js
```
使用该脚本能够自动扫描项目中的全部中文字符串，并生成名为"allkeys.json"的文件。该文件便于查看项目中未进行国际化处理的中文字符串。


