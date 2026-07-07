export interface ToolSeoRelatedLink {
  label: string
  path: string
}

export interface ToolSeoFaq {
  question: string
  answer: string
}

export interface ToolSeoContent {
  heading: string
  metaTitle: string
  metaDescription: string
  keywords: string
  intro: string
  scenarios: string[]
  steps: string[]
  faqs: ToolSeoFaq[]
  relatedTools: ToolSeoRelatedLink[]
}

export const toolSeoContents: Record<string, ToolSeoContent> = {
  '/json': {
    heading: 'JSON 格式化、压缩与校验怎么用',
    metaTitle: 'JSON格式化工具',
    metaDescription: '在线 JSON 格式化、压缩与校验工具，适合接口调试、配置整理和 JSON 语法检查。支持高亮预览、复制结果，开发者可快速处理数据。',
    keywords: 'JSON格式化,JSON校验,JSON压缩,JSON编辑器,在线JSON工具',
    intro: 'JSON 格式化工具适合开发调试接口、整理配置文件、检查接口响应结构。粘贴 JSON 后可以快速格式化、压缩、转义或校验语法，让层级关系更清楚，也方便复制给同事、文档或接口调试工具使用。',
    scenarios: ['接口返回数据阅读和排查', '配置文件格式整理', 'JSON 压缩后用于传输或存储'],
    steps: ['粘贴需要处理的 JSON 字符串。', '点击格式化、压缩、转义或校验按钮。', '根据错误提示修正语法，再复制处理后的结果。'],
    faqs: [
      { question: 'JSON 格式化会上传服务器吗？', answer: '工具主要在浏览器中处理输入内容。涉及真实用户信息、密钥或订单数据时，仍建议先脱敏再粘贴。' },
      { question: 'JSON 报错通常从哪里检查？', answer: '优先检查双引号、逗号、冒号、括号闭合和转义字符，很多错误都来自多余逗号或中文符号。' },
      { question: '格式化和压缩有什么区别？', answer: '格式化会增加缩进便于阅读，压缩会去掉空白字符以减少体积，适合不同使用场景。' },
    ],
    relatedTools: [
      { label: 'Base64 编码解码', path: '/base64' },
      { label: 'URL 编码解码', path: '/urlencode' },
      { label: 'JWT 解析', path: '/jwt' },
      { label: 'Mock 数据生成', path: '/mock-data' },
    ],
  },
  '/md5': {
    heading: 'MD5 摘要生成适合哪些场景',
    metaTitle: 'MD5在线加密工具',
    metaDescription: '在线生成 16 位、32 位 MD5 摘要，支持常见文本哈希计算、数据校验和开发调试。提醒：MD5 不适合保存密码。',
    keywords: 'MD5,在线MD5,MD5加密,MD5摘要,哈希计算',
    intro: 'MD5 工具可以把文本快速计算成固定长度摘要，常用于文件名校验、缓存 Key、接口签名调试和历史系统兼容。需要注意，MD5 更准确地说是摘要算法，不是安全加密算法，不建议用于新系统的密码保存。',
    scenarios: ['生成文本摘要或缓存标识', '对接旧接口签名规则', '快速比较两段内容是否一致'],
    steps: ['输入或粘贴需要计算的文本。', '选择 16 位、32 位或大小写格式。', '复制生成结果用于校验、调试或记录。'],
    faqs: [
      { question: 'MD5 可以反解原文吗？', answer: 'MD5 是单向摘要算法，理论上不能直接反解，但短文本可能被彩虹表撞库，因此不要把它当作安全加密。' },
      { question: 'MD5 适合保存密码吗？', answer: '不适合。密码应使用 bcrypt、Argon2、PBKDF2 等带盐且可调成本的密码哈希算法。' },
      { question: '16 位 MD5 和 32 位 MD5 哪个更常用？', answer: '32 位更常见，16 位通常是从 32 位结果中截取的一段，具体要看接口或系统要求。' },
    ],
    relatedTools: [
      { label: '哈希校验/HMAC', path: '/hash' },
      { label: '随机密码生成', path: '/randompassword' },
      { label: 'Base64 编码解码', path: '/base64' },
    ],
  },
  '/qrcode': {
    heading: '在线二维码生成指南',
    metaTitle: '二维码生成工具',
    metaDescription: '在线生成二维码，支持网址、文本、联系方式等内容，可调整样式并添加 Logo，适合海报、名片、活动页和资料分享。',
    keywords: '二维码生成,在线二维码,二维码制作,网址二维码,带Logo二维码',
    intro: '二维码生成工具适合把网址、文本、联系方式或活动信息转换成可扫码访问的二维码。你可以根据使用场景调整尺寸、颜色和 Logo，让二维码既能稳定识别，也能更贴合海报、名片或页面风格。',
    scenarios: ['网站链接和活动页面分享', '海报、名片、资料页放置扫码入口', '把短文本或联系方式做成二维码'],
    steps: ['输入网址、文本或需要编码的内容。', '按需设置尺寸、颜色、容错率和 Logo。', '预览确认可识别后下载图片。'],
    faqs: [
      { question: '二维码加 Logo 会影响识别吗？', answer: 'Logo 过大可能影响识别，建议提高容错率并控制 Logo 尺寸，下载后用手机实际扫码测试。' },
      { question: '网址二维码需要带 https 吗？', answer: '建议填写完整 https 地址，扫码后跳转更明确，也更符合现代浏览器安全提示。' },
      { question: '二维码适合放多长内容？', answer: '内容越长二维码越复杂，识别难度会增加。长链接建议先使用短链或精简参数。' },
    ],
    relatedTools: [
      { label: '二维码识别', path: '/qrcode-scan' },
      { label: '短链生成', path: '/short-link' },
      { label: '图片压缩', path: '/image-compress' },
    ],
  },
  '/markdown': {
    heading: 'Markdown 在线编辑与预览',
    metaTitle: 'Markdown在线编辑器',
    metaDescription: '在线 Markdown 编辑器，支持实时预览、常用语法编辑和内容整理，适合写 README、技术文档、笔记和发布前排版。',
    keywords: 'Markdown编辑器,在线Markdown,Markdown预览,README编辑,技术文档',
    intro: 'Markdown 编辑器适合编写技术文档、README、博客草稿、产品说明和个人笔记。左侧编辑、右侧预览能帮助你快速确认标题、列表、代码块、链接和表格效果，减少发布前的排版反复。',
    scenarios: ['编写 README 和技术文档', '整理博客草稿或学习笔记', '检查 Markdown 表格、代码块和链接格式'],
    steps: ['在编辑区输入或粘贴 Markdown 内容。', '查看实时预览，确认标题、列表、代码块等格式。', '复制 Markdown 原文或预览结果用于发布。'],
    faqs: [
      { question: 'Markdown 适合写什么内容？', answer: '它适合结构清晰的文档、笔记、教程和说明书，尤其适合开发者文档和 GitHub README。' },
      { question: '为什么预览和某些平台显示不一样？', answer: '不同平台支持的 Markdown 扩展不同，表格、任务列表、HTML 标签等可能存在差异。' },
      { question: '可以粘贴 HTML 吗？', answer: '为了安全和一致性，建议优先使用 Markdown 语法，不要依赖复杂 HTML。' },
    ],
    relatedTools: [
      { label: '字数统计', path: '/wordcount' },
      { label: '文本对比', path: '/diff' },
      { label: '公众号排版', path: '/wechat-format' },
    ],
  },
  '/base64': {
    heading: 'Base64 编码解码说明',
    metaTitle: 'Base64编码解码工具',
    metaDescription: '在线 Base64 编码解码工具，支持中文文本双向转换，适合接口调试、配置处理、简单数据转码和开发测试。',
    keywords: 'Base64编码,Base64解码,在线Base64,文本转Base64,Base64转换',
    intro: 'Base64 常用于把文本或二进制数据转换成可安全传输的字符串，在接口调试、配置字段、邮件内容和简单数据转码中很常见。它不是加密方式，只是编码方式，任何人都可以解码查看原文。',
    scenarios: ['接口参数或配置字段转码', '中文文本转换为可传输字符串', '排查 Base64 内容是否可正常解码'],
    steps: ['输入需要编码或解码的文本。', '选择 Base64 编码或 Base64 解码。', '检查结果是否符合预期，再复制使用。'],
    faqs: [
      { question: 'Base64 是加密吗？', answer: '不是。Base64 只是编码，不能保护隐私或安全，敏感内容不要仅靠 Base64 隐藏。' },
      { question: 'Base64 解码失败怎么办？', answer: '检查字符串是否缺少尾部等号、是否混入空格换行，或原内容是否并非标准 Base64。' },
      { question: '中文可以 Base64 编码吗？', answer: '可以，通常会按 UTF-8 处理中文，解码时也需要使用一致的字符集。' },
    ],
    relatedTools: [
      { label: 'JSON 格式化', path: '/json' },
      { label: 'URL 编码解码', path: '/urlencode' },
      { label: '图片、Base64 互转', path: '/imagetobase64' },
    ],
  },
  '/timetran': {
    heading: '时间戳与日期时间互转',
    metaTitle: '时间戳转换工具',
    metaDescription: '在线 Unix 时间戳转换工具，支持秒级、毫秒级时间戳与北京时间互转，适合日志排查、接口调试和数据处理。',
    keywords: '时间戳转换,Unix时间戳,在线时间转换,毫秒时间戳,北京时间',
    intro: '时间戳转换工具适合查看接口返回时间、分析日志、处理数据库时间字段。你可以把 Unix 时间戳转换成可读日期，也可以把指定日期转换为秒级或毫秒级时间戳，减少手动计算误差。',
    scenarios: ['接口时间字段调试', '服务器日志时间排查', '数据库时间戳转换和核对'],
    steps: ['输入时间戳或选择日期时间。', '确认单位是秒级还是毫秒级。', '查看转换结果并复制到代码、日志或文档中。'],
    faqs: [
      { question: '秒级和毫秒级时间戳怎么区分？', answer: '秒级通常是 10 位数字，毫秒级通常是 13 位数字，长度不同会导致转换结果相差很大。' },
      { question: '转换结果为什么和预期差 8 小时？', answer: '这通常和时区有关。北京时间是 UTC+8，排查日志时要确认系统使用的时区。' },
      { question: '时间戳适合存数据库吗？', answer: '可以，但要统一单位和时区约定，避免不同系统之间混用秒和毫秒。' },
    ],
    relatedTools: [
      { label: 'Cron 表达式生成', path: '/cron' },
      { label: 'JSON 格式化', path: '/json' },
      { label: '文本对比', path: '/diff' },
    ],
  },
  '/urlencode': {
    heading: 'URL 编码与解码怎么用',
    metaTitle: 'URL编码解码工具',
    metaDescription: '在线 URL 编码解码工具，支持中文、特殊符号和查询参数转换，适合链接处理、接口调试和参数排查。',
    keywords: 'URL编码,URL解码,在线URL编码,链接编码,参数解码',
    intro: 'URL 编码工具可以把中文、空格、特殊符号转换成适合放在链接中的格式，也可以把已经编码的参数还原成人能读懂的文本。它常用于接口调试、跳转链接排查和营销链接参数检查。',
    scenarios: ['处理中文链接和特殊符号参数', '排查接口 Query 参数', '还原被编码的跳转地址'],
    steps: ['粘贴需要处理的 URL 或参数文本。', '选择编码或解码操作。', '检查结果中的保留字符和参数结构，再复制使用。'],
    faqs: [
      { question: '什么时候需要 URL 编码？', answer: '当链接里包含中文、空格、#、&、= 等特殊字符时，通常需要编码避免浏览器误解析。' },
      { question: '编码后为什么有很多百分号？', answer: '百分号加十六进制数字是 URL 编码的标准表示方式，用于安全传输特殊字符。' },
      { question: '整个 URL 和单个参数都能编码吗？', answer: '可以，但要注意整条 URL 编码会连冒号、斜杠等一起处理，接口调试时通常只编码参数值。' },
    ],
    relatedTools: [
      { label: 'JSON 格式化', path: '/json' },
      { label: 'Base64 编码解码', path: '/base64' },
      { label: 'JWT 解析', path: '/jwt' },
    ],
  },
  '/randompassword': {
    heading: '随机密码生成建议',
    metaTitle: '随机密码生成器',
    metaDescription: '在线随机密码生成器，支持长度、数字、大小写字母和符号组合设置，适合创建更强的账号密码、临时口令和测试密码。',
    keywords: '随机密码生成,密码生成器,在线密码生成,强密码,批量密码',
    intro: '随机密码生成器可以按照长度、字符类型和数量批量生成密码，适合注册新账号、重置临时口令、生成测试数据。建议重要账号使用较长密码，并配合密码管理器保存，避免多个网站重复使用同一个密码。',
    scenarios: ['创建新账号强密码', '生成临时口令或测试密码', '批量生成不重复的随机字符串'],
    steps: ['设置密码长度、数量和字符类型。', '点击生成并检查是否符合目标网站规则。', '复制密码并保存到可信的密码管理器。'],
    faqs: [
      { question: '强密码一般要多长？', answer: '建议至少 12 位以上，重要账号可以使用 16 位或更长，并混合大小写字母、数字和符号。' },
      { question: '密码需要定期更换吗？', answer: '如果密码唯一且足够强，不必频繁更换；一旦怀疑泄露，应立即更换并开启双重验证。' },
      { question: '可以用同一个密码注册多个网站吗？', answer: '不建议。一个网站泄露会影响其他账号，最好每个重要账号使用独立密码。' },
    ],
    relatedTools: [
      { label: '在线密码管理', path: '/password-manager' },
      { label: 'MD5 在线加密', path: '/md5' },
      { label: '哈希校验/HMAC', path: '/hash' },
    ],
  },
  '/diff': {
    heading: '文本和代码差异对比',
    metaTitle: '文本对比工具',
    metaDescription: '在线文本对比工具，支持中文、英文、配置和代码差异比对，适合查找修改点、版本差异和文案变更。',
    keywords: '文本对比,代码对比,在线Diff,差异比对,文案对比',
    intro: '文本对比工具可以把两段文字、代码、配置或接口返回内容放在一起比较，快速找出新增、删除和修改的位置。它适合排查配置差异、审查文案改动、比对接口响应，也能减少人工逐行检查的遗漏。',
    scenarios: ['比较两版文案或合同草稿', '排查配置文件差异', '查看代码片段或接口响应变化'],
    steps: ['把原始内容粘贴到左侧。', '把新内容粘贴到右侧。', '查看高亮差异，定位新增、删除或修改位置。'],
    faqs: [
      { question: '文本对比支持中文吗？', answer: '支持。中文、英文、代码和配置文本都可以比较，效果取决于内容换行和格式是否清晰。' },
      { question: '为什么整段都被标记为变化？', answer: '可能是换行、空格或格式差异较大。可以先格式化内容，再进行对比。' },
      { question: '适合比较 JSON 吗？', answer: '适合，但建议先用 JSON 工具格式化两份内容，再放入文本对比，结果会更清楚。' },
    ],
    relatedTools: [
      { label: 'JSON 格式化', path: '/json' },
      { label: 'Markdown 编辑器', path: '/markdown' },
      { label: '字数统计', path: '/wordcount' },
    ],
  },
  '/wordcount': {
    heading: '在线字数统计和文本计数',
    metaTitle: '在线字数统计工具',
    metaDescription: '在线字数统计工具，支持中文字符、英文单词、段落和行数统计，适合论文、小说、文案、简历和新媒体内容控字。',
    keywords: '字数统计,在线字数计算,字符统计,单词统计,文本计数',
    intro: '字数统计工具适合写论文、小说、简历、产品文案和新媒体内容时控制长度。粘贴文本后可以快速查看字符数、字数、行数等信息，帮助你判断内容是否符合平台限制或投稿要求。',
    scenarios: ['论文、作文和投稿字数检查', '公众号、小红书、短视频文案控字', '简历和产品描述长度优化'],
    steps: ['粘贴需要统计的文本。', '查看字数、字符数、行数等统计结果。', '根据平台或文档要求删改内容长度。'],
    faqs: [
      { question: '中文字数和字符数一样吗？', answer: '不完全一样。字符数通常包含标点、空格和换行，字数统计会根据规则做不同处理。' },
      { question: '英文内容能统计单词吗？', answer: '可以，英文文本通常按空格和标点分隔统计单词数量。' },
      { question: '统计结果和 Word 不一致怎么办？', answer: '不同软件对空格、标点和换行的计算规则略有差异，正式提交前建议以目标平台为准。' },
    ],
    relatedTools: [
      { label: 'Markdown 编辑器', path: '/markdown' },
      { label: '文本对比', path: '/diff' },
      { label: '公众号排版', path: '/wechat-format' },
    ],
  },
  '/jwt': {
    heading: 'JWT 解析与调试说明',
    metaTitle: 'JWT解析工具',
    metaDescription: '在线 JWT 解析工具，可解码 Header、Payload 和过期时间，适合接口认证调试、Token 内容检查和登录问题排查。',
    keywords: 'JWT解析,JWT解码,JSON Web Token,Token解析,在线JWT',
    intro: 'JWT 解析工具可以把 JSON Web Token 拆分为 Header、Payload 和签名部分，方便查看用户标识、权限字段、签发时间和过期时间。它适合接口认证调试，但解析不等于验证签名，敏感 Token 不建议随意粘贴到公共环境。',
    scenarios: ['查看 Token 载荷字段', '排查登录态过期问题', '调试接口认证和权限信息'],
    steps: ['粘贴完整 JWT 字符串。', '查看 Header、Payload 和时间字段。', '结合后端密钥或公钥验证签名和有效性。'],
    faqs: [
      { question: 'JWT 解析后就代表 Token 有效吗？', answer: '不代表。解析只是在本地解码内容，是否有效还需要验证签名、过期时间和服务端状态。' },
      { question: 'JWT 内容是加密的吗？', answer: '大多数 JWT 只是 Base64URL 编码，Payload 可被解码查看，所以不要把密码等敏感信息放进去。' },
      { question: 'exp 字段怎么看？', answer: 'exp 通常是秒级 Unix 时间戳，可以配合时间戳工具转换成可读时间。' },
    ],
    relatedTools: [
      { label: '时间戳转换', path: '/timetran' },
      { label: 'Base64 编码解码', path: '/base64' },
      { label: 'JSON 格式化', path: '/json' },
    ],
  },
  '/cron': {
    heading: 'Cron 表达式生成与校验',
    metaTitle: 'Cron表达式生成器',
    metaDescription: '在线 Cron 表达式生成器，支持定时任务规则配置、常用模板和执行时间预览，适合运维、后端任务和自动化脚本。',
    keywords: 'Cron表达式,Cron生成器,定时任务,在线Cron,Cron校验',
    intro: 'Cron 表达式生成器适合配置定时任务、自动化脚本、数据同步和后台调度。通过可视化选项生成表达式，可以降低手写规则出错的概率，也能通过预览确认任务是否会在期望时间执行。',
    scenarios: ['后端定时任务配置', '运维脚本和自动化任务调度', '检查 Cron 规则是否符合预期'],
    steps: ['选择秒、分、时、日、月、周等规则。', '查看生成的 Cron 表达式和执行预览。', '复制到任务系统，并在目标环境确认 Cron 格式兼容性。'],
    faqs: [
      { question: '为什么不同系统 Cron 位数不一样？', answer: 'Linux crontab 常见 5 位，Quartz 等系统可能支持秒和年。使用前要确认目标系统格式。' },
      { question: '周和日期能同时设置吗？', answer: '不同 Cron 实现规则不同，有的会同时生效，有的需要用问号占位，建议参考目标系统文档。' },
      { question: '如何避免任务误触发？', answer: '先查看未来执行时间预览，再在测试环境验证，重要任务建议设置日志和告警。' },
    ],
    relatedTools: [
      { label: '时间戳转换', path: '/timetran' },
      { label: 'JSON 格式化', path: '/json' },
      { label: '文本对比', path: '/diff' },
    ],
  },
  '/hash': {
    heading: '哈希摘要与 HMAC 校验',
    metaTitle: '哈希校验/HMAC工具',
    metaDescription: '在线哈希校验和 HMAC 计算工具，支持 SHA-1、SHA-256、SHA-512、HMAC-SHA256 等摘要，适合文件校验和接口签名调试。',
    keywords: 'SHA256,HMAC,哈希校验,SHA512,摘要计算,接口签名',
    intro: '哈希校验工具可以计算文本或文件摘要，用于确认内容是否被篡改、比对文件完整性或调试接口签名。HMAC 则会结合密钥生成消息认证码，更适合服务端接口验签和安全校验场景。',
    scenarios: ['文件完整性校验', '接口签名和验签调试', '生成 SHA 系列摘要用于记录或比对'],
    steps: ['输入文本、上传文件或填写密钥。', '选择 SHA、HMAC 等算法。', '复制摘要结果，与目标系统输出进行比对。'],
    faqs: [
      { question: '哈希和加密有什么区别？', answer: '哈希通常不可逆，用于摘要和校验；加密可在有密钥时还原原文，用途不同。' },
      { question: 'HMAC 为什么需要密钥？', answer: 'HMAC 用密钥参与计算，可以证明消息来自持有密钥的一方，常用于接口签名。' },
      { question: '文件哈希不一致说明什么？', answer: '说明文件内容、编码、换行或下载过程可能不同，需要重新确认源文件和算法。' },
    ],
    relatedTools: [
      { label: 'MD5 在线加密', path: '/md5' },
      { label: '随机密码生成', path: '/randompassword' },
      { label: 'JWT 解析', path: '/jwt' },
    ],
  },
  '/qrcode-scan': {
    heading: '二维码识别与内容读取',
    metaTitle: '二维码识别工具',
    metaDescription: '在线二维码识别工具，支持上传图片、拖拽识别和摄像头扫描，适合读取二维码内容、检查链接和验证生成效果。',
    keywords: '二维码识别,二维码扫描,在线扫码,二维码读取,图片识别二维码',
    intro: '二维码识别工具可以从图片或摄像头中读取二维码内容，适合检查二维码是否生成正确、还原二维码里的网址或文本，也能在电脑上快速识别手机截图中的二维码信息。',
    scenarios: ['读取截图或图片里的二维码', '验证二维码生成结果是否正确', '检查二维码中包含的网址或文本'],
    steps: ['上传二维码图片，或开启摄像头扫描。', '等待工具识别二维码内容。', '复制识别结果，必要时先确认链接安全再访问。'],
    faqs: [
      { question: '二维码识别失败怎么办？', answer: '检查图片是否清晰、二维码是否完整，尽量避免反光、变形和过度压缩。' },
      { question: '识别出的链接可以直接打开吗？', answer: '建议先看清域名和路径，陌生链接不要直接打开，避免钓鱼或恶意跳转。' },
      { question: '摄像头扫描需要授权吗？', answer: '需要浏览器授权摄像头权限。若不方便授权，可以改用上传图片识别。' },
    ],
    relatedTools: [
      { label: '二维码生成', path: '/qrcode' },
      { label: 'URL 编码解码', path: '/urlencode' },
      { label: '图片压缩', path: '/image-compress' },
    ],
  },
  '/image-compress': {
    heading: '在线图片压缩和体积优化',
    metaTitle: '图片压缩工具',
    metaDescription: '在线图片压缩工具，支持 JPG、PNG、WebP 等格式，可调整压缩质量并预览体积变化，适合网站图片优化和上传限制处理。',
    keywords: '图片压缩,在线压缩图片,JPG压缩,PNG压缩,WebP压缩,图片优化',
    intro: '图片压缩工具适合在上传网站、公众号、表单或社交平台前减少图片体积。你可以根据清晰度和文件大小要求调整压缩质量，既提升页面加载速度，也减少因图片过大导致的上传失败。',
    scenarios: ['网站和博客图片体积优化', '处理平台上传大小限制', '批量压缩截图、照片或素材图'],
    steps: ['选择需要压缩的图片文件。', '调整压缩质量或输出格式。', '预览体积变化，确认清晰度后下载。'],
    faqs: [
      { question: '压缩图片会变模糊吗？', answer: '压缩质量过低会影响清晰度，建议在体积和画质之间取平衡，重要图片保留原图备份。' },
      { question: 'JPG、PNG、WebP 该选哪个？', answer: '照片适合 JPG 或 WebP，透明背景图适合 PNG 或 WebP，网站加载通常优先考虑 WebP。' },
      { question: '图片压缩对 SEO 有帮助吗？', answer: '有帮助。更小的图片通常能改善加载速度，对用户体验和搜索表现都有正面影响。' },
    ],
    relatedTools: [
      { label: 'PNG/JPG 格式互转', path: '/img-convert' },
      { label: 'PDF 转图片', path: '/pdf-to-image' },
      { label: '二维码生成', path: '/qrcode' },
    ],
  },
  '/pdf-to-image': {
    heading: 'PDF 转图片使用说明',
    metaTitle: 'PDF转图片工具',
    metaDescription: '在线 PDF 转图片工具，支持多页 PDF 转 PNG/JPG 图片，可调整清晰度，适合资料预览、页面截图和文档分享。',
    keywords: 'PDF转图片,PDF转PNG,PDF转JPG,在线PDF转换,PDF截图',
    intro: 'PDF 转图片工具适合把文档页面转换成图片，用于资料预览、课件分享、页面截图、报表归档和不方便直接发送 PDF 的场景。转换时可以关注清晰度和文件体积，按实际用途选择合适格式。',
    scenarios: ['把 PDF 页面转成图片分享', '提取文档页面用于 PPT 或文章', '生成资料预览图和页面截图'],
    steps: ['上传需要转换的 PDF 文件。', '选择输出格式、页码范围或清晰度。', '等待转换完成后下载图片。'],
    faqs: [
      { question: 'PDF 转图片会改变排版吗？', answer: '通常会按页面渲染成图片，版式保持较稳定，但清晰度取决于转换分辨率。' },
      { question: '多页 PDF 可以一次转换吗？', answer: '可以按页面输出多张图片，文件较大时建议分批处理。' },
      { question: '转成 PNG 还是 JPG 更好？', answer: '文字和截图类页面适合 PNG，照片较多的文档适合 JPG，体积通常更小。' },
    ],
    relatedTools: [
      { label: '图片压缩', path: '/image-compress' },
      { label: 'PNG/JPG 格式互转', path: '/img-convert' },
      { label: 'PDF 页眉页脚编辑', path: '/pdf-editor' },
    ],
  },
  '/img-convert': {
    heading: 'PNG、JPG 图片格式互转',
    metaTitle: 'PNG/JPG格式转换工具',
    metaDescription: '在线 PNG、JPG 图片格式互转工具，支持质量调节和实时预览，适合透明图处理、照片压缩和常见图片格式转换。',
    keywords: 'PNG转JPG,JPG转PNG,图片格式转换,在线图片转换,PNG转换,JPG转换',
    intro: '图片格式转换工具适合在 PNG、JPG 等常见格式之间切换。PNG 更适合透明背景和截图，JPG 更适合照片和较小体积。通过预览和质量调节，可以快速得到适合上传、分享或网页使用的图片。',
    scenarios: ['PNG 转 JPG 减小照片或截图体积', 'JPG 转 PNG 用于统一素材格式', '上传平台要求指定图片格式时转换'],
    steps: ['上传需要转换的图片。', '选择目标格式和质量参数。', '预览效果，确认后下载新图片。'],
    faqs: [
      { question: 'PNG 转 JPG 会丢失透明背景吗？', answer: '会。JPG 不支持透明通道，透明区域通常会变成白色或指定背景色。' },
      { question: 'JPG 转 PNG 会让图片变清晰吗？', answer: '不会恢复已经损失的细节，只是更换容器格式，原图清晰度仍取决于源文件。' },
      { question: '什么时候应该用 WebP？', answer: '网站图片可以优先考虑 WebP，它通常在较好画质下体积更小，但要确认使用场景是否支持。' },
    ],
    relatedTools: [
      { label: '图片压缩', path: '/image-compress' },
      { label: 'PDF 转图片', path: '/pdf-to-image' },
      { label: '图片加水印', path: '/img-watermark' },
    ],
  },
  '/ai-text-to-image': {
    heading: 'AI 文生图提示词建议',
    metaTitle: 'AI文生图工具',
    metaDescription: '在线 AI 文生图工具，输入中文或英文提示词生成图片，适合灵感草图、封面配图、头像素材和创意视觉探索。',
    keywords: 'AI文生图,AI绘画,在线AI绘画,文生图工具,AI图片生成',
    intro: 'AI 文生图适合从文字快速生成创意图片、封面草图、头像素材、海报灵感和视觉参考。提示词越清楚，越容易得到稳定结果。建议描述主体、风格、构图、颜色、光线和用途，再根据结果逐步微调。',
    scenarios: ['生成文章封面和社交配图灵感', '制作头像、插画或海报草图', '探索产品、场景和视觉风格方案'],
    steps: ['输入主体、风格、画面比例和细节要求。', '选择模型、尺寸或其他生成参数。', '根据结果继续补充提示词并重新生成。'],
    faqs: [
      { question: '提示词怎么写效果更好？', answer: '按“主体 + 场景 + 风格 + 构图 + 光线 + 色彩 + 用途”描述，避免只写一个很泛的词。' },
      { question: 'AI 生图偶尔失败正常吗？', answer: '正常。模型服务、网络、内容安全策略和提示词复杂度都可能影响成功率，可以稍后重试或简化提示词。' },
      { question: '生成图片可以商用吗？', answer: '需要查看所用模型和服务的授权条款。重要商业用途建议保留生成记录并做二次审核。' },
    ],
    relatedTools: [
      { label: 'AI 翻译', path: '/ai-translate' },
      { label: 'AI 聊天', path: '/ai-chat' },
      { label: '图片压缩', path: '/image-compress' },
    ],
  },
  '/ai-translate': {
    heading: 'AI 翻译适合怎样使用',
    metaTitle: 'AI翻译工具',
    metaDescription: '在线 AI 翻译工具，支持多语言互译和语气优化，适合邮件、文档、短句、提示词和跨语言沟通内容处理。',
    keywords: 'AI翻译,在线翻译,多语言翻译,英文翻译,提示词翻译',
    intro: 'AI 翻译工具适合处理邮件、说明文档、提示词、短句和跨语言沟通内容。相比逐词翻译，AI 更擅长根据上下文调整表达。正式合同、医学、法律等高风险内容仍建议人工复核。',
    scenarios: ['中文、英文及多语言内容互译', '优化邮件、说明文和提示词表达', '快速理解外文资料的大意'],
    steps: ['输入需要翻译的原文。', '选择目标语言，必要时补充语气或场景要求。', '检查专有名词、数字和关键结论，再复制使用。'],
    faqs: [
      { question: 'AI 翻译一定准确吗？', answer: '不一定。日常文本通常表现较好，但专业术语、合同条款和医疗法律内容要人工复核。' },
      { question: '为什么同一句话每次翻译不完全一样？', answer: 'AI 模型会根据上下文和生成策略给出不同表达，只要意思准确，轻微差异是正常的。' },
      { question: '翻译提示词时需要注意什么？', answer: '保留模型、参数、风格词和专有名词，避免把关键英文标签翻译得过度口语化。' },
    ],
    relatedTools: [
      { label: 'AI 文生图', path: '/ai-text-to-image' },
      { label: 'AI 聊天', path: '/ai-chat' },
      { label: 'Markdown 编辑器', path: '/markdown' },
    ],
  },
  '/mock-data': {
    heading: 'Mock 数据生成和接口测试',
    metaTitle: 'Mock数据生成器',
    metaDescription: '在线 Mock 数据生成器，可视化定义字段 Schema，一键生成测试 JSON，适合前端联调、接口文档、原型演示和测试数据准备。',
    keywords: 'Mock数据,测试数据生成,接口Mock,JSON生成,假数据生成,Schema',
    intro: 'Mock 数据生成器适合在后端接口未完成、需要准备测试数据或编写接口文档时使用。你可以定义字段类型、层级结构和示例规则，快速生成接近真实业务的 JSON 数据，帮助前端开发和产品演示更顺畅。',
    scenarios: ['前端页面开发和接口联调', '接口文档示例数据生成', '测试、演示和原型阶段准备假数据'],
    steps: ['选择示例模板，或手动添加字段 Schema。', '设置字段类型、数量、是否必填和嵌套结构。', '生成 JSON 数据，复制到接口文档、Mock 服务或测试用例中。'],
    faqs: [
      { question: 'Mock 数据可以替代真实接口吗？', answer: '它适合开发和演示阶段使用，不能完全替代真实接口的权限、异常、性能和数据一致性验证。' },
      { question: '生成的数据会保存吗？', answer: '未登录时通常保存在当前浏览器，清除浏览器数据可能丢失；登录后可按页面能力同步到云端。' },
      { question: '怎么让数据更接近真实业务？', answer: '字段命名、类型范围、数组数量和嵌套结构要尽量贴近真实接口文档，避免只生成无意义字符串。' },
    ],
    relatedTools: [
      { label: 'JSON 格式化', path: '/json' },
      { label: '随机中文姓名', path: '/chinese-name' },
      { label: '随机密码生成', path: '/randompassword' },
    ],
  },
}

const aliasPathMap = new Map([
  ['/ai/text-to-image', '/ai-text-to-image'],
])

export const normalizeToolSeoPath = (path: string) => {
  if (!path || path === '/') return '/'
  const cleanPath = path.split('?')[0].replace(/\/+$/, '') || '/'
  return aliasPathMap.get(cleanPath) || cleanPath
}

export const getToolSeoContent = (path: string) => toolSeoContents[normalizeToolSeoPath(path)]

export const getToolSeoMeta = (path: string) => {
  const content = getToolSeoContent(path)
  if (!content) return null

  return {
    title: content.metaTitle,
    keywords: content.keywords,
    description: content.metaDescription,
  }
}
