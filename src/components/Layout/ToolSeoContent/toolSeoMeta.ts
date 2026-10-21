export interface ToolSeoMeta {
  title: string
  keywords: string
  description: string
}

export const normalizeToolSeoPath = (path: string) => {
  if (!path || path === '/') return '/'
  const cleanPath = path.split('?')[0].replace(/\/+$/, '') || '/'
  return cleanPath
}

export const toolSeoMetaMap: Record<string, ToolSeoMeta> = {
  '/unit/length': {
    title: '长度单位换算',
    keywords: '长度换算,长度单位转换,在线长度换算',
    description: '在线长度单位换算，支持千米、米、厘米、毫米、英尺、英寸等单位，输入任意数值即可同时查看其他单位结果。',
  },
  '/unit/area': {
    title: '面积单位换算',
    keywords: '面积换算,面积单位转换,在线面积换算',
    description: '在线面积单位换算，支持平方米、平方千米、公顷、亩及常见英制面积单位，适合土地、房屋和测量数据整理。',
  },
  '/unit/weight': {
    title: '重量单位换算',
    keywords: '重量换算,重量单位转换,在线重量换算',
    description: '在线重量单位换算，支持千克、克、吨、斤、两、磅和盎司等单位，便于比较包装重量、食材和物流数据。',
  },
  '/unit/time': {
    title: '时间单位换算',
    keywords: '时间换算,时间单位转换,在线时间换算',
    description: '在线时间单位换算，支持日、小时、分钟、秒、毫秒、周以及年和月的近似换算，适合时长统计与开发调试。',
  },
  '/unit/temperature': {
    title: '温度单位换算',
    keywords: '温度换算,温度单位转换,在线温度换算',
    description: '在线温度单位换算，支持摄氏度、华氏度、开尔文、列氏度和兰氏度，输入温度即可查看各温标的对应结果。',
  },
  '/unit/pressure': {
    title: '压力单位换算',
    keywords: '压力换算,压力单位转换,在线压力换算',
    description: '在线压力单位换算，支持 Pa、kPa、hPa、MPa、bar、torr、psi 等单位，适合气压、设备参数与测量数据换算。',
  },
  '/unit/heat': {
    title: '热量单位换算',
    keywords: '热量换算,热量单位转换,在线热量换算',
    description: '在线热量与能量单位换算，支持 Wh、mWh、kWh、MWh、J 和 kJ，可用于电能记录、设备耗能和学习计算。',
  },
  '/unit/power': {
    title: '功率单位换算',
    keywords: '功率换算,功率单位转换,在线功率换算',
    description: '在线功率单位换算，支持 W、mW、kW、MW 和 GW，适合电器铭牌、设备选型与工程数据的单位统一。',
  },

  '/json': {
    title: 'JSON格式化工具',
    keywords: 'JSON格式化,JSON校验,JSON压缩,JSON编辑器,在线JSON工具',
    description: '在线 JSON 格式化、压缩与校验工具，适合接口调试、配置整理和 JSON 语法检查。支持高亮预览、复制结果，开发者可快速处理数据。',
  },
  '/md5': {
    title: 'MD5在线加密工具',
    keywords: 'MD5,在线MD5,MD5加密,MD5摘要,哈希计算',
    description: '在线生成 16 位、32 位 MD5 摘要，支持常见文本哈希计算、数据校验和开发调试。提醒：MD5 不适合保存密码。',
  },
  '/qrcode': {
    title: '二维码生成工具',
    keywords: '二维码生成,在线二维码,二维码制作,网址二维码,带Logo二维码',
    description: '在线生成二维码，支持网址、文本、联系方式等内容，可调整样式并添加 Logo，适合海报、名片、活动页和资料分享。',
  },
  '/markdown': {
    title: 'Markdown在线编辑器',
    keywords: 'Markdown编辑器,在线Markdown,Markdown预览,README编辑,技术文档',
    description: '在线 Markdown 编辑器，支持实时预览、常用语法编辑和内容整理，适合写 README、技术文档、笔记和发布前排版。',
  },
  '/base64': {
    title: 'Base64编码解码工具',
    keywords: 'Base64编码,Base64解码,在线Base64,文本转Base64,Base64转换',
    description: '在线 Base64 编码解码工具，支持中文文本双向转换，适合接口调试、配置处理、简单数据转码和开发测试。',
  },
  '/timetran': {
    title: '时间戳转换工具',
    keywords: '时间戳转换,Unix时间戳,在线时间转换,毫秒时间戳,北京时间',
    description: '在线 Unix 时间戳转换工具，支持秒级、毫秒级时间戳与北京时间互转，适合日志排查、接口调试和数据处理。',
  },
  '/urlencode': {
    title: 'URL编码解码工具',
    keywords: 'URL编码,URL解码,在线URL编码,链接编码,参数解码',
    description: '在线 URL 编码解码工具，支持中文、特殊符号和查询参数转换，适合链接处理、接口调试和参数排查。',
  },
  '/randompassword': {
    title: '随机密码生成器',
    keywords: '随机密码生成,密码生成器,在线密码生成,强密码,批量密码',
    description: '在线随机密码生成器，支持长度、数字、大小写字母和符号组合设置，适合创建更强的账号密码、临时口令和测试密码。',
  },
  '/diff': {
    title: '文本对比工具',
    keywords: '文本对比,代码对比,在线Diff,差异比对,文案对比',
    description: '在线文本对比工具，支持中文、英文、配置和代码差异比对，适合查找修改点、版本差异和文案变更。',
  },
  '/wordcount': {
    title: '在线字数统计工具',
    keywords: '字数统计,在线字数计算,字符统计,单词统计,文本计数',
    description: '在线字数统计工具，支持中文字符、英文单词、段落和行数统计，适合论文、小说、文案、简历和新媒体内容控字。',
  },
  '/jwt': {
    title: 'JWT解析工具',
    keywords: 'JWT解析,JWT解码,JSON Web Token,Token解析,在线JWT',
    description: '在线 JWT 解析工具，可解码 Header、Payload 和过期时间，适合接口认证调试、Token 内容检查和登录问题排查。',
  },
  '/cron': {
    title: 'Cron表达式生成器',
    keywords: 'Cron表达式,Cron生成器,定时任务,在线Cron,Cron校验',
    description: '在线 Cron 表达式生成器，支持定时任务规则配置、常用模板和执行时间预览，适合运维、后端任务和自动化脚本。',
  },
  '/hash': {
    title: '哈希校验/HMAC工具',
    keywords: 'SHA256,HMAC,哈希校验,SHA512,摘要计算,接口签名',
    description: '在线哈希校验和 HMAC 计算工具，支持 SHA-1、SHA-256、SHA-512、HMAC-SHA256 等摘要，适合文件校验和接口签名调试。',
  },
  '/qrcode-scan': {
    title: '二维码识别工具',
    keywords: '二维码识别,二维码扫描,在线扫码,二维码读取,图片识别二维码',
    description: '在线二维码识别工具，支持上传图片、拖拽识别和摄像头扫描，适合读取二维码内容、检查链接和验证生成效果。',
  },
  '/image-compress': {
    title: '图片压缩工具',
    keywords: '图片压缩,在线压缩图片,JPG压缩,PNG压缩,WebP压缩,图片优化',
    description: '在线图片压缩工具，支持 JPG、PNG、WebP 等格式，可调整压缩质量并预览体积变化，适合网站图片优化和上传限制处理。',
  },
  '/pdf-to-image': {
    title: 'PDF转图片工具',
    keywords: 'PDF转图片,PDF转PNG,PDF转JPG,在线PDF转换,PDF截图',
    description: '在线 PDF 转图片工具，支持多页 PDF 转 PNG/JPG 图片，可调整清晰度，适合资料预览、页面截图和文档分享。',
  },
  '/img-convert': {
    title: 'PNG/JPG格式转换工具',
    keywords: 'PNG转JPG,JPG转PNG,图片格式转换,在线图片转换,PNG转换,JPG转换',
    description: '在线 PNG、JPG 图片格式互转工具，支持质量调节和实时预览，适合透明图处理、照片压缩和常见图片格式转换。',
  },
  '/mock-data': {
    title: 'Mock数据生成器',
    keywords: 'Mock数据,测试数据生成,接口Mock,JSON生成,假数据生成,Schema',
    description: '在线 Mock 数据生成器，可视化定义字段 Schema，一键生成测试 JSON，适合前端联调、接口文档、原型演示和测试数据准备。',
  },
}

export const hasToolSeoContent = (path: string) => {
  return Boolean(toolSeoMetaMap[normalizeToolSeoPath(path)])
}

export const getToolSeoMeta = (path: string) => {
  return toolSeoMetaMap[normalizeToolSeoPath(path)] || null
}
