# 历史迁移说明

本目录保留早期开发阶段的单功能迁移文件，仅用于追溯旧环境，不是当前 D1 初始化入口。

- 当前数据库：`tools-web-db`
- 当前迁移唯一来源：`functions/db/`
- 新数据库按根目录 `README.md` 中列出的顺序执行 `functions/db/000...017`。
- 不要对新库或生产库直接执行本目录文件；执行任何带 `--remote` 的命令前必须先确认目标数据库状态。

`functions/db/000_init_core_tables.sql` 已包含 todos、password、mock_schemas 等核心表结构。
