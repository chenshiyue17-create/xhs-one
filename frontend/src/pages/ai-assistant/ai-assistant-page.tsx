import { RobotOutlined, SendOutlined } from "@ant-design/icons";
import { Button, Card, Input, List, Space, Typography } from "antd";
import { useState } from "react";

const { Title, Paragraph } = Typography;

export function AIAssistantPage() {
  const [messages, setMessages] = useState<{ role: string, content: string }[]>([
    { role: "assistant", content: "您好！我是您的小红书行业专家助手。我已经接入了您的本地门窗知识库和工作台数据，有什么可以帮您的吗？" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const simulateStreaming = async (text: string) => {
    setIsTyping(true);
    let currentContent = "";
    const newMessageIndex = messages.length + 1;
    
    // 先添加一个空的回复
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    const chunks = text.split("");
    for (let i = 0; i < chunks.length; i++) {
      currentContent += chunks[i];
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: currentContent };
        return next;
      });
      // 模拟流式延迟
      await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 50));
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
      // 1. 调用真实的后端 API
      const response = await fetch("/api/ai/expert-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${window.localStorage.getItem("xhs_access_token")}` // 携带 Token
        },
        body: JSON.stringify({ query: userMsg }),
      });

      const data = await response.json();
      const realResponse = data.content || "未收到有效回复。";

      // 2. 执行打字机流式动效显示真实数据
      await simulateStreaming(realResponse);
      
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: `连接后端失败：${err}` }]);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <Title level={2}><RobotOutlined /> AI 行业专家助手</Title>
      <Paragraph>
        此助手已深度整合 MCP 服务与 RAG 知识库，可直接分析您的业务文档及小红书运营数据。
      </Paragraph>
      
      <Card style={{ height: "60vh", overflowY: "auto", marginBottom: 24 }}>
        <List
          dataSource={messages}
          renderItem={(msg) => (
            <List.Item style={{ justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ 
                background: msg.role === "user" ? "#1677ff" : "#303030", 
                color: "#fff",
                padding: "8px 16px",
                borderRadius: 8,
                maxWidth: "80%"
              }}>
                {msg.content}
              </div>
            </List.Item>
          )}
        />
      </Card>

      <Space.Compact style={{ width: '100%' }}>
        <Input 
          placeholder="请输入您的问题，例如：分析我最近关于‘系统窗’的笔记趋势..." 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={handleSend}
          size="large"
        />
        <Button type="primary" size="large" icon={<SendOutlined />} onClick={handleSend}>发送</Button>
      </Space.Compact>
    </div>
  );
}
