import { RobotOutlined, SendOutlined, SettingOutlined, TagOutlined } from "@ant-design/icons";
import { Button, Card, Input, List, Space, Typography, Select, message } from "antd";
import { useState, useEffect } from "react";
import { BUILD_VERSION } from "../../lib/version";
import { fetchModelConfigs, setDefaultModelConfig, http } from "../../lib/api"; // 引入 http 实例

const { Title, Paragraph, Text } = Typography;

export function AIAssistantPage() {
  const [messages, setMessages] = useState<{ role: string, content: string }[]>([
    { role: "assistant", content: "您好！我是您的小红书行业专家助手。我已经接入了您的本地门窗知识库和工作台数据，有什么可以帮您的吗？" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [models, setModels] = useState<any[]>([]);
  const [activeModelId, setActiveModelId] = useState<number | null>(null);

  // 1. 获取可用模型列表
  useEffect(() => {
    const loadModels = async () => {
      try {
        const data = await fetchModelConfigs("text");
        const items = data.items || [];
        setModels(items);
        const active = items.find((m: any) => m.is_default);
        if (active) {
          setActiveModelId(active.id);
        } else if (items.length > 0) {
          setActiveModelId(items[0].id);
        }
      } catch (err: any) {
        console.error("AI 助手加载模型失败:", err);
      }
    };
    loadModels();
  }, []);

  // 2. 切换默认模型
  const handleModelChange = async (id: number) => {
    try {
      await setDefaultModelConfig(id);
      setActiveModelId(id);
      message.success("AI 引擎切换成功！");
    } catch (err) { }
  };

  const simulateStreaming = async (text: string) => {
    setIsTyping(true);
    let currentContent = "";
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    const chunks = text.split("");
    for (let i = 0; i < chunks.length; i++) {
      currentContent += chunks[i];
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: currentContent };
        return next;
      });
      await new Promise(resolve => setTimeout(resolve, 15 + Math.random() * 20));
    }
    setIsTyping(false);
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    const newMessages = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setInput("");

    try {
      // 3. 使用系统标准 http (Axios) 请求，自动处理 Token 和 baseURL
      const response = await http.post("/ai/expert-chat", { query: userMsg });
      const realResponse = response.data.content || "未收到有效回复内容。";
      await simulateStreaming(realResponse);

    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || "请求失败";
      setMessages(prev => [...prev, { role: "assistant", content: `❌ 助手思考中断：${errorMsg}` }]);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Title level={2} style={{ margin: 0 }}><RobotOutlined /> AI 行业专家助手</Title>
          <Text type="secondary" style={{ fontSize: 10 }}><TagOutlined /> Build: {BUILD_VERSION}</Text>
        </div>
        <Space>
          <span style={{ color: "rgba(255,255,255,0.6)" }}><SettingOutlined /> 切换 AI 引擎:</span>
          <Select
            style={{ width: 220 }}
            value={activeModelId}
            onChange={handleModelChange}
            placeholder={models.length > 0 ? "请选择 AI 模型" : "正在加载模型..."}
            options={models.map(m => ({ label: m.name, value: m.id }))}
          />
        </Space>
      </div>
      <Paragraph>
        此助手已深度整合 MCP 服务与 RAG 知识库，可直接分析您的业务文档及小红书运营数据。
      </Paragraph>

      <Card style={{ height: "60vh", overflowY: "auto", marginBottom: 24 }}>
        <List
          dataSource={messages}
          renderItem={(msg) => (
            <List.Item style={{ justifyContent: msg.role === "user" ? "flex-end" : "flex-start", border: "none" }}>
              <div style={{
                background: msg.role === "user" ? "#1677ff" : "#303030",
                color: "#fff",
                padding: "10px 16px",
                borderRadius: 12,
                maxWidth: "85%",
                whiteSpace: "pre-wrap"
              }}>
                {msg.content}
              </div>
            </List.Item>
          )}
        />
      </Card>

      <Space.Compact style={{ width: '100%' }}>
        <Input
          placeholder="请输入您的问题..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={handleSend}
          size="large"
          disabled={isTyping}
        />
        <Button type="primary" size="large" icon={<SendOutlined />} onClick={handleSend} loading={isTyping}>发送</Button>
      </Space.Compact>
    </div>
  );
}
