# scani18n
vue3+TS+vue-i18n

## 前提条件

1. 在使用 `scanVue3i18n.js` 之前，需要设置百度翻译 API 的配置。请在 `scanVue3i18n.js` 文件的第40行和第41行填入你的 API 密钥。你可以在[百度翻译开放平台](http://api.fanyi.baidu.com/api/trans/product/desktop)申请API密钥。

2. 如果你的项目中有一些通用的翻译值，比如 "取消"、"编辑"、"添加" 等，你可以创建一个名为 `common.json` 的文件，并在其中定义这些通用值的翻译。示例内容如下：

```json
{
  "取消": "cancel",
  "编辑": "edit",
  "添加": "add"
}
```

## 使用方法

1. 在运行脚本之前，请确保你已经安装了 Node.js，并执行以下命令来安装脚本依赖：

   ```bash
   npm install
   ```

2. 运行以下命令来执行 `scanVue3i18n.js` 脚本：

   ```bash
   node scanVue3i18n.js
   ```

3. 使用该脚本可以扫描 Vue 3 项目中的国际化字符串，然后通过百度翻译 API 进行自动翻译。脚本会根据 `common.json` 中的配置和百度翻译 API，自动将项目中的字符串进行翻译并更新对应的国际化文件。

   注意：请确保网络连接正常以便能够访问百度翻译 API。

