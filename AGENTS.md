<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Tile10 product plan

The product plan for this project lives on a Tile10 canvas
(MCP server "t10").

- Before deciding what to build — and whenever asked "what's next" —
  call get_product_plan first and ground the answer in it.
- When you start a plan task, call update_task_status ("in_progress");
  when you finish and verify it, set "completed".
- Log newly discovered work with create_task.
