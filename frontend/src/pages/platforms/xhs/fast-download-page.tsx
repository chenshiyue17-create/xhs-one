import {
  CheckOutlined,
  CloudDownloadOutlined,
  CommentOutlined,
  CopyOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  GlobalOutlined,
  HeartOutlined,
  LeftOutlined,
  LinkOutlined,
  LoadingOutlined,
  PictureOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  RocketOutlined,
  RightOutlined,
  SearchOutlined,
  StarOutlined,
} from "@ant-design/icons";
import { Alert, Button, Card, Col, Empty, Input, Progress, Row, Select, Space, Tag, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";

import { apiUrl, downloadXhsNote, extractXhsCopy, fetchAccounts, fetchSavedNoteIds, fetchXhsUserNotes, http, saveXhsNotesToLibrary } from "../../../lib/api";
import type { PlatformAccount, XhsCopyExtractItem, XhsSearchNote } from "../../../types";

const { Title, Text } = Typography;

function formatMetric(value: number): string {
  if (value >= 10000) return `${(value / 10000).toFixed(value >= 100000 ? 0 : 1)}w`;
  return value?.toLocaleString() || "0";
}

export function XhsFastDownloadPage() {
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [copyUrlInput, setCopyUrlInput] = useState("");
  const [bloggerUrl, setBloggerUrl] = useState("");
  const [isCrawlingBlogger, setIsCrawlingBlogger] = useState(false);
  const [isExtractingCopy, setIsExtractingCopy] = useState(false);
  const [copyResults, setCopyResults] = useState<XhsCopyExtractItem[]>([]);
  const [selectedCopyUrl, setSelectedCopyUrl] = useState("");
  const [tasks, setTasks] = useState<Array<Record<string, any>>>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [savedNoteIds, setSavedNoteIds] = useState<string[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});

  const pcAccounts = useMemo(() => accounts.filter((a) => a.platform === "xhs" && a.sub_type === "pc"), [accounts]);
  const pcAccountOptions = useMemo(() => pcAccounts.map((a) => ({ value: a.id, label: `${a.nickname || `PC ${a.id}`} · ${a.status}` })), [pcAccounts]);
  const selectedCopy = useMemo(
    () => copyResults.find((item) => item.url === selectedCopyUrl) || copyResults[0] || null,
    [copyResults, selectedCopyUrl]
  );
  const copyStats = useMemo(() => ({
    total: copyResults.length,
    success: copyResults.filter((item) => item.status === "success").length,
    video: copyResults.filter((item) => item.video_copy?.trim()).length
  }), [copyResults]);

  async function loadAccounts() {
    setIsLoadingAccounts(true);
    try {
      const loaded = await fetchAccounts("xhs");
      setAccounts(loaded);
      const first = loaded.find((a) => a.sub_type === "pc");
      setSelectedAccountId((c) => c ?? first?.id ?? null);
    } catch {
      message.error("账号列表加载失败");
    } finally {
      setIsLoadingAccounts(false);
    }
  }

  async function loadSavedNoteIds() {
    try {
      const ids = await fetchSavedNoteIds("xhs");
      setSavedNoteIds(ids);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    void loadAccounts();
    void loadSavedNoteIds();

    // 进度轮询
    const timer = setInterval(async () => {
      try {
        const res = await http.get("/fast-downloader/tasks", { _silent: true } as never);
        setProgressMap(res.data);
      } catch { /* silent */ }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  async function handleBloggerCrawl() {
    if (!selectedAccountId) { message.warning("请先选择一个账号"); return; }
    const cleanUrl = bloggerUrl.trim();
    if (!cleanUrl || !cleanUrl.includes("/user/profile/")) { message.warning("请输入有效的博主主页链接"); return; }
    
    setIsCrawlingBlogger(true);
    try {
      const response = await fetchXhsUserNotes({ account_id: selectedAccountId, user_url: cleanUrl });
      if (response.items && response.items.length > 0) {
        message.success(`成功获取 ${response.items.length} 篇笔记，已加入队列`);
        for (const note of response.items) {
          const taskId = "task_" + Math.random().toString(36).substr(2, 9);
          // 将 XhsSearchNote 格式转换为下载任务格式
          const downloadTask = {
            id: taskId,
            url: note.note_url,
            "作品ID": note.note_id,
            "作品标题": note.title,
            "作者昵称": note.author_name,
            "封面地址": note.cover_url,
            "作品类型": note.type,
            "点赞数量": note.likes,
            "收藏数量": note.collects,
            "评论数量": note.comments,
            status: "pending"
          };
          setTasks((prev) => [downloadTask, ...prev]);
          void processTask(taskId, note.note_url || "");
        }
        setBloggerUrl("");
      } else {
        message.info("该博主主页暂无公开笔记");
      }
    } catch (e) {
      message.error("获取博主笔记失败");
    } finally {
      setIsCrawlingBlogger(false);
    }
  }

  async function handleFastDownload() {
    if (!selectedAccountId) {
      message.warning("请先绑定并选择一个 PC 账号");
      return;
    }
    const urls = urlInput.match(/https?:\/\/[^\s]+/g);
    if (!urls) {
      message.warning("请输入有效的小红书链接");
      return;
    }
    setUrlInput("");

    for (const url of urls) {
      const taskId = "task_" + Math.random().toString(36).substr(2, 9);
      // 添加一个临时任务卡片
      setTasks((prev) => [{ id: taskId, url, status: "pending" }, ...prev]);
      void processTask(taskId, url);
    }
  }

  function parseUrls(input: string): string[] {
    const matches = input.match(/https?:\/\/[^\s，,]+/g) || [];
    return Array.from(new Set(matches.map((url) => url.trim())));
  }

  function formatCopyItem(item: XhsCopyExtractItem): string {
    return [
      `标题：${item.title || "未提取到标题"}`,
      `作者：${item.author_name || "-"}`,
      `链接：${item.url}`,
      "",
      "文案：",
      item.copy || "未提取到正文文案",
      "",
      "视频文案：",
      item.video_copy || "未提取到视频口播/字幕文案"
    ].join("\n");
  }

  async function copyText(text: string, successMessage: string) {
    if (!text.trim()) {
      message.info("没有可复制的内容");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      message.success(successMessage);
    } catch {
      message.warning("复制失败，请手动选择文本复制");
    }
  }

  async function handleCopyExtract() {
    if (!selectedAccountId) {
      message.warning("请先选择一个 PC 账号");
      return;
    }
    const urls = parseUrls(copyUrlInput);
    if (urls.length === 0) {
      message.warning("请输入有效的小红书链接");
      return;
    }
    setIsExtractingCopy(true);
    try {
      const response = await extractXhsCopy({ urls, account_id: selectedAccountId });
      setCopyResults(response.items);
      setSelectedCopyUrl(response.items[0]?.url || "");
      if (response.success_count > 0) {
        message.success(`已提取 ${response.success_count}/${response.total} 条文案`);
        setCopyUrlInput("");
      } else {
        message.warning("暂未提取到可用文案，请检查账号权限或链接可访问性");
      }
    } catch (e: any) {
      const detail = e?.response?.data?.detail || e?.message || "文案提取失败";
      message.error(detail);
    } finally {
      setIsExtractingCopy(false);
    }
  }

  async function copyAllResults() {
    const text = copyResults.filter((item) => item.status === "success").map(formatCopyItem).join("\n\n---\n\n");
    await copyText(text, "已复制全部提取结果");
  }

  async function openDownloadFolder() {
    try {
      const res = await http.post("/ops/open-folder", { path: "backend/Volume/Download" });
      const data = res.data as { opened?: boolean; path?: string; message?: string };
      if (data?.opened) {
        message.success(data.message || "已打开下载目录");
      } else {
        message.info(data?.message || data?.path || "已返回下载目录路径");
      }
    } catch {
      // http interceptor already shows message.error
    }
  }

  async function openTaskFolder(task: Record<string, any>) {
    const localDir = task["本地下载目录"];
    const localFiles = Array.isArray(task["本地文件列表"]) ? task["本地文件列表"] : [];
    if (!localDir) {
      message.info("当前任务还没有返回实际下载目录");
      return;
    }
    try {
      const normalized = String(localDir);
      const res = await http.post("/ops/open-folder", { path: normalized, reveal_file: localFiles[0] || null });
      const data = res.data as { opened?: boolean; path?: string; message?: string };
      if (data?.opened) {
        message.success(data.message || "已打开本次下载目录");
      } else {
        await navigator.clipboard.writeText(normalized).catch(() => undefined);
        message.info((data?.message || data?.path || "已返回本次下载目录路径") + "，目录已复制到剪贴板");
      }
    } catch {
      await navigator.clipboard.writeText(String(localDir)).catch(() => undefined);
      message.warning(`自动打开失败，目录已复制到剪贴板：${localDir}`);
    }
  }

  async function processTask(taskId: string, url: string) {
    try {
      const res = await downloadXhsNote({ url, task_id: taskId, account_id: selectedAccountId });
      if (res.data?.["下载成功"] && (res.data?.["本地文件数量"] || 0) > 0) {
        const completedTask = { ...res.data, id: taskId, status: "completed" };
        setTasks((prev) => prev.map(t => t.id === taskId ? { ...t, ...completedTask } : t));
        const assetLabel = res.data["作品类型"] === "视频" ? "视频" : "图片";
        message.success(`${assetLabel}已就绪: ${res.data["作品标题"] || "作品"}`);
        if (res.data["本地下载目录"]) {
          void openTaskFolder(completedTask);
        }
      } else if (res.data) {
        const firstFailure = Array.isArray(res.data?.["下载失败详情"]) ? res.data["下载失败详情"][0] : null;
        const failureReason = firstFailure?.error || firstFailure?.source || "未检测到本地下载文件，请检查账号权限或原链接资源";
        const errorMessage = `下载失败：${failureReason}`;
        setTasks((prev) => prev.map(t => t.id === taskId ? { ...t, ...res.data, status: "failed", error: errorMessage } : t));
        message.error(errorMessage);
      } else {
        setTasks((prev) => prev.map(t => t.id === taskId ? { ...t, status: "failed", error: res.message } : t));
        message.error(`下载失败: ${res.message}`);
      }
    } catch (e: any) {
      const detail = e?.response?.data?.detail || e?.response?.data?.message || e?.message || "网络请求失败";
      setTasks((prev) => prev.map(t => t.id === taskId ? { ...t, status: "failed", error: detail } : t));
      message.error(`下载失败: ${detail}`);
    }
  }

  async function handleSaveToLibrary(note: any) {
    if (!selectedAccountId) {
      message.warning("请先选择一个 PC 账号");
      return;
    }
    try {
      // 转换格式
      const xhsNote: XhsSearchNote = {
        note_id: note["作品ID"],
        title: note["作品标题"],
        content: note["作品描述"],
        author_id: note["作者ID"],
        author_name: note["作者昵称"],
        author_avatar: "",
        cover_url: note["封面地址"],
        likes: note["点赞数量"] || 0,
        collects: note["收藏数量"] || 0,
        comments: note["评论数量"] || 0,
        shares: 0,
        type: note["作品类型"],
        raw: note
      };
      await saveXhsNotesToLibrary({ account_id: selectedAccountId, notes: [xhsNote] });
      message.success("已保存到内容库");
      setSavedNoteIds((prev) => [...prev, xhsNote.note_id]);
    } catch {
      message.error("保存失败");
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>🚀 快速下载器</Title>
          <Text type="secondary">粘贴链接即刻开启无水印秒下，支持批量处理</Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<FolderOpenOutlined />} onClick={openDownloadFolder}>打开下载目录</Button>
            <Button icon={<ReloadOutlined />} onClick={loadAccounts} loading={isLoadingAccounts}>刷新账号</Button>
          </Space>
        </Col>
      </Row>

      {pcAccounts.length === 0 ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="当前没有可用的 PC 下载账号"
          description="请先在账号矩阵中绑定并确认一个可用的 PC 账号，再回来使用快速下载。"
        />
      ) : null}

      <Card style={{ marginBottom: 24, background: "#141414" }}>
        <div style={{ marginBottom: 12 }}>
          <Text strong style={{ color: "rgba(255,255,255,0.85)" }}>笔记链接</Text>
        </div>
        <Input.TextArea
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="请粘贴小红书链接，支持多个链接批量下载..."
          autoSize={{ minRows: 4, maxRows: 6 }}
          style={{ background: "#1f1f1f", border: "1px solid #303030", color: "#fff", marginBottom: 16 }}
        />

        <div style={{ marginBottom: 12 }}>
          <Text strong style={{ color: "rgba(255,255,255,0.85)" }}>博主主页</Text>
        </div>
        <Row gutter={12} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Input
              value={bloggerUrl}
              onChange={(e) => setBloggerUrl(e.target.value)}
              placeholder="粘贴博主主页链接，自动下载该博主的所有笔记..."
              style={{ background: "#1f1f1f", border: "1px solid #303030", color: "#fff" }}
            />
          </Col>
          <Col>
            <Button icon={<SearchOutlined />} loading={isCrawlingBlogger} onClick={handleBloggerCrawl}>博主直下</Button>
          </Col>
        </Row>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Space>
            <Text type="secondary" style={{ fontSize: 12 }}>下载账号: </Text>
            <Select
              value={selectedAccountId}
              onChange={setSelectedAccountId}
              size="small"
              style={{ width: 180 }}
              options={pcAccountOptions}
            />
          </Space>
          <Button type="primary" size="large" icon={<RocketOutlined />} onClick={handleFastDownload}>立即开始批量下载</Button>
        </div>
      </Card>

      <Card style={{ marginBottom: 24, background: "#141414", border: "1px solid #303030" }}>
        <Row gutter={[16, 16]} align="stretch">
          <Col xs={24} lg={10}>
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <div>
                <Text strong style={{ color: "rgba(255,255,255,0.85)" }}>
                  <FileTextOutlined style={{ marginRight: 8 }} />
                  链接文案提取
                </Text>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>批量提取标题、正文文案和视频口播/字幕候选。</Text>
                </div>
              </div>
              <Input.TextArea
                value={copyUrlInput}
                onChange={(e) => setCopyUrlInput(e.target.value)}
                placeholder="粘贴小红书笔记链接，可一次输入多条..."
                autoSize={{ minRows: 5, maxRows: 8 }}
                style={{ background: "#1f1f1f", border: "1px solid #303030", color: "#fff" }}
              />
              <Row gutter={8}>
                <Col span={8}>
                  <Card size="small" style={{ background: "#1f1f1f", borderColor: "#303030" }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>结果</Text>
                    <div style={{ color: "#fff", fontWeight: 700 }}>{copyStats.total} 条</div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small" style={{ background: "#1f1f1f", borderColor: "#303030" }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>成功</Text>
                    <div style={{ color: "#52c41a", fontWeight: 700 }}>{copyStats.success} 条</div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small" style={{ background: "#1f1f1f", borderColor: "#303030" }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>视频文案</Text>
                    <div style={{ color: "#1677ff", fontWeight: 700 }}>{copyStats.video} 条</div>
                  </Card>
                </Col>
              </Row>
              <Space>
                <Button type="primary" icon={<FileTextOutlined />} loading={isExtractingCopy} onClick={handleCopyExtract}>仅提取文案</Button>
                <Button icon={<CopyOutlined />} disabled={copyResults.length === 0} onClick={copyAllResults}>复制全部</Button>
              </Space>
            </Space>
          </Col>
          <Col xs={24} lg={14}>
            <Row gutter={[12, 12]}>
              <Col xs={24} md={10}>
                <div style={{ minHeight: 280, maxHeight: 360, overflow: "auto", border: "1px solid #303030", borderRadius: 8, background: "#101010" }}>
                  {copyResults.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无文案提取结果" style={{ marginTop: 64 }} />
                  ) : copyResults.map((item) => (
                    <button
                      key={item.url}
                      type="button"
                      onClick={() => setSelectedCopyUrl(item.url)}
                      style={{
                        width: "100%",
                        display: "block",
                        textAlign: "left",
                        padding: 12,
                        border: 0,
                        borderBottom: "1px solid #262626",
                        background: selectedCopy?.url === item.url ? "#1d2a44" : "transparent",
                        color: "#fff",
                        cursor: "pointer",
                        height: "auto"
                      }}
                    >
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                        <Tag color={item.status === "success" ? "success" : "error"}>{item.status === "success" ? "成功" : "失败"}</Tag>
                        {item.note_type ? <Tag color={item.video_copy ? "blue" : "default"}>{item.note_type}</Tag> : null}
                      </div>
                      <Text ellipsis style={{ display: "block", color: "rgba(255,255,255,0.88)" }}>{item.title || item.message || "未命名链接"}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{item.author_name || item.source || "待检查"}</Text>
                    </button>
                  ))}
                </div>
              </Col>
              <Col xs={24} md={14}>
                <div style={{ minHeight: 280, border: "1px solid #303030", borderRadius: 8, background: "#101010", padding: 16 }}>
                  {selectedCopy ? (
                    <Space direction="vertical" size={12} style={{ width: "100%" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                        <div style={{ minWidth: 0 }}>
                          <Text strong style={{ color: "#fff", fontSize: 16 }}>{selectedCopy.title || "未提取到标题"}</Text>
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {selectedCopy.author_name || "未知作者"} · 赞 {formatMetric(selectedCopy.likes)} · 藏 {formatMetric(selectedCopy.collects)} · 评 {formatMetric(selectedCopy.comments)}
                            </Text>
                          </div>
                        </div>
                        <Space>
                          <Button size="small" icon={<CopyOutlined />} onClick={() => copyText(formatCopyItem(selectedCopy), "已复制当前文案")}>复制</Button>
                          <Button size="small" icon={<LinkOutlined />} href={selectedCopy.url} target="_blank">原文</Button>
                        </Space>
                      </div>
                      {selectedCopy.tags?.length ? (
                        <Space size={4} wrap>{selectedCopy.tags.map((tag) => <Tag key={tag} color="blue">#{tag}</Tag>)}</Space>
                      ) : null}
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>正文文案</Text>
                        <pre style={{ whiteSpace: "pre-wrap", margin: "6px 0 0", color: "rgba(255,255,255,0.82)", background: "#1f1f1f", borderRadius: 6, padding: 12, maxHeight: 130, overflow: "auto" }}>
                          {selectedCopy.copy || "未提取到正文文案"}
                        </pre>
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>视频文案</Text>
                        <pre style={{ whiteSpace: "pre-wrap", margin: "6px 0 0", color: "rgba(255,255,255,0.82)", background: "#1f1f1f", borderRadius: 6, padding: 12, maxHeight: 130, overflow: "auto" }}>
                          {selectedCopy.video_copy || "未提取到视频口播/字幕文案"}
                        </pre>
                      </div>
                    </Space>
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="选择一条结果查看标题、文案和视频文案" style={{ marginTop: 64 }} />
                  )}
                </div>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      <div style={{ marginBottom: 16 }}>
        <Title level={5}>下载队列 ({tasks.length})</Title>
      </div>

      <Row gutter={[16, 16]}>
        {tasks.length === 0 ? (
          <Col span={24}>
            <Empty description="暂无下载任务，快去粘贴链接吧" />
          </Col>
        ) : (
          tasks.map((task) => (
            <Col span={24} key={task.id}>
              <Card size="small" style={{ background: "#141414", border: "1px solid #303030" }}>
                <Row gutter={16} align="middle">
                  <Col span={4}>
                    <div style={{ width: "100%", aspectRatio: "3/4", background: "#1f1f1f", borderRadius: 4, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {task["封面地址"] ? (
                        <img src={task["封面地址"]} alt="封面" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <LoadingOutlined style={{ fontSize: 24, color: "rgba(255,255,255,0.2)" }} />
                      )}
                    </div>
                  </Col>
                  <Col span={20}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <Text strong style={{ fontSize: 15, color: "#fff" }}>{task["作品标题"] || (task.status === "pending" ? "正在解析链接..." : "无标题作品")}</Text>
                      <Tag color={task.status === "completed" ? "success" : (task.status === "failed" ? "error" : "processing")}>
                        {task.status === "completed" ? "下载完成" : (task.status === "failed" ? "下载失败" : "正在处理")}
                      </Tag>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      {task["作者昵称"] && <Text type="secondary" style={{ fontSize: 13 }}>@{task["作者昵称"]} </Text>}
                      {task["作品类型"] && <Tag color="blue">{task["作品类型"]}</Tag>}
                      <div style={{ marginTop: 4 }}>
                        <Space size={12} style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                          <span>❤️ {formatMetric(task["点赞数量"])}</span>
                          <span>⭐ {formatMetric(task["收藏数量"])}</span>
                          <span>💬 {formatMetric(task["评论数量"])}</span>
                        </Space>
                      </div>
                    </div>
                    
                    {progressMap[task.id] !== undefined && task.status !== "completed" && (
                      <div style={{ marginBottom: 12 }}>
                        <Progress percent={progressMap[task.id]} size="small" status="active" strokeColor="#ff2442" />
                      </div>
                    )}

                    <Space>
                      <Button size="small" ghost type="primary" icon={<DatabaseOutlined />} disabled={savedNoteIds.includes(task["作品ID"]) || !task["作品ID"]} onClick={() => handleSaveToLibrary(task)}>
                        {savedNoteIds.includes(task["作品ID"]) ? "已存库" : "保存到内容库"}
                      </Button>
                      <Button size="small" icon={<FolderOpenOutlined />} disabled={!task["本地下载目录"]} onClick={() => openTaskFolder(task)}>打开本次目录</Button>
                      <Button size="small" icon={<LinkOutlined />} href={task["作品链接"] || task.url} target="_blank">查看原文</Button>
                      {task.error && <Text type="danger" style={{ fontSize: 12 }}>错误: {task.error}</Text>}
                    </Space>
                    {task["本地下载目录"] ? (
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>保存位置：{task["本地下载目录"]}</Text>
                      </div>
                    ) : null}
                  </Col>
                </Row>
              </Card>
            </Col>
          ))
        )}
      </Row>
    </div>
  );
}
