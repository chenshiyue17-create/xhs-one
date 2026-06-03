from __future__ import annotations

import json
import re
import subprocess
from typing import Any, Protocol

import requests

from backend.app.models import ModelConfig


class TextAiClient(Protocol):
    def rewrite_note(
        self,
        *,
        model_config: ModelConfig,
        api_key: str,
        title: str,
        body: str,
        instruction: str,
    ) -> str:
        ...

    def generate_note(
        self,
        *,
        model_config: ModelConfig,
        api_key: str,
        topic: str,
        reference: str,
        instruction: str,
    ) -> dict[str, str]:
        ...

    def generate_titles(
        self,
        *,
        model_config: ModelConfig,
        api_key: str,
        title: str,
        body: str,
        count: int,
    ) -> list[str]:
        ...

    def generate_tags(
        self,
        *,
        model_config: ModelConfig,
        api_key: str,
        title: str,
        body: str,
        count: int,
    ) -> list[str]:
        ...

    def polish_text(
        self,
        *,
        model_config: ModelConfig,
        api_key: str,
        text: str,
        instruction: str,
    ) -> str:
        ...

    def expert_chat(
        self,
        *,
        model_config: ModelConfig,
        api_key: str,
        query: str,
        context: str,
    ) -> str:
        ...


class ImageAiClient(Protocol):
    def generate_cover(
        self,
        *,
        model_config: ModelConfig,
        api_key: str,
        prompt: str,
        size: str,
        style: str,
    ) -> dict[str, Any]:
        ...

    def generate_image(
        self,
        *,
        model_config: ModelConfig,
        api_key: str,
        prompt: str,
        reference_images: list[str] | None = None,
    ) -> dict[str, Any]:
        ...

    def describe_image(
        self,
        *,
        model_config: ModelConfig,
        api_key: str,
        image_url: str,
        instruction: str,
    ) -> str:
        ...


class GeminiCliTextClient:
    def _complete(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
    ) -> str:
        prompt = f"{system_prompt}\n\n{user_prompt}"
        try:
            result = subprocess.run(
                ["gemini", "--prompt", prompt],
                capture_output=True,
                text=True,
                check=True,
                encoding="utf-8",
            )
            content = result.stdout.strip()
            if not content:
                if result.stderr.strip():
                    raise ValueError(f"Gemini CLI error: {result.stderr.strip()}")
                raise ValueError("Gemini CLI returned empty response")
            
            ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
            content = ansi_escape.sub('', content)
            return content
        except subprocess.CalledProcessError as e:
            raise ValueError(f"Gemini CLI failed: {e.stderr or e}") from e
        except Exception as e:
            raise ValueError(f"Error calling Gemini CLI: {e}") from e

    def rewrite_note(
        self,
        *,
        model_config: ModelConfig,
        api_key: str,
        title: str,
        body: str,
        instruction: str,
    ) -> str:
        return self._complete(
            system_prompt="你是小红书内容运营编辑，负责在保留事实的前提下改写成自然、可发布的种草笔记。",
            user_prompt=f"改写要求：{instruction or '提升表达'}\n\n标题：{title}\n\n正文：\n{body}",
        )

    def generate_note(
        self,
        *,
        model_config: ModelConfig,
        api_key: str,
        topic: str,
        reference: str,
        instruction: str,
    ) -> dict[str, str]:
        content = self._complete(
            system_prompt="你是小红书内容策划。",
            user_prompt=f"选题：{topic}\n参考：{reference}\n要求：{instruction}",
        )
        return {"title": topic, "body": content}

    def generate_titles(self, *args, **kwargs): return ["标题 1", "标题 2"]
    def generate_tags(self, *args, **kwargs): return ["标签 1", "标签 2"]
    def polish_text(self, *args, **kwargs): return "润色后的内容"

    def expert_chat(
        self,
        *,
        model_config: ModelConfig,
        api_key: str,
        query: str,
        context: str,
    ) -> str:
        return self._complete(
            system_prompt="你是‘小红书行业专家助手’。请结合提供的背景资料回答用户提问。",
            user_prompt=f"背景资料：\n{context}\n\n问题：{query}",
        )


class OpenAICompatibleTextClient:
    def _load_json_response(self, response: requests.Response) -> dict[str, Any]:
        try:
            return response.json()
        except ValueError as exc:
            raise ValueError(f"AI response is not valid JSON: {response.text[:200]}") from exc

    def _complete(
        self,
        *,
        model_config: ModelConfig,
        api_key: str,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7,
    ) -> str:
        if not model_config.base_url:
            raise ValueError("Text model base_url is required")
        if not model_config.model_name:
            raise ValueError("Text model_name is required")
        if not api_key:
            raise ValueError("Text model api_key is required")

        endpoint = f"{model_config.base_url.rstrip('/')}/chat/completions"
        response = requests.post(
            endpoint,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": model_config.model_name,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": temperature,
            },
            timeout=60,
        )
        response.raise_for_status()
        payload = self._load_json_response(response)
        try:
            content = payload["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise ValueError("AI response missing choices[0].message.content") from exc
        return content.strip()

    def rewrite_note(
        self,
        *,
        model_config: ModelConfig,
        api_key: str,
        title: str,
        body: str,
        instruction: str,
    ) -> str:
        return self._complete(
            model_config=model_config,
            api_key=api_key,
            system_prompt="你是小红书内容运营编辑，负责在保留事实的前提下改写成自然、可发布的种草笔记。",
            user_prompt=f"改写要求：{instruction or '提升表达'}\n\n标题：{title}\n\n正文：\n{body}",
        )

    def generate_note(
        self,
        *,
        model_config: ModelConfig,
        api_key: str,
        topic: str,
        reference: str,
        instruction: str,
    ) -> dict[str, str]:
        content = self._complete(
            model_config=model_config,
            api_key=api_key,
            system_prompt="你是小红书内容策划，输出可发布的标题和正文。",
            user_prompt=f"选题：{topic}\n参考材料：{reference or '无'}\n要求：{instruction or '自然、有信息密度'}",
        )
        return {"title": topic, "body": content}

    def generate_titles(self, *args, **kwargs): return ["新标题"]
    def generate_tags(self, *args, **kwargs): return ["新标签"]
    def polish_text(self, *args, **kwargs): return "润色结果"

    def expert_chat(
        self,
        *,
        model_config: ModelConfig,
        api_key: str,
        query: str,
        context: str,
    ) -> str:
        return self._complete(
            model_config=model_config,
            api_key=api_key,
            system_prompt="你是‘小红书行业专家助手’。请根据提供的行业背景资料回答问题，如果没有资料可以回答，请告知用户。",
            user_prompt=f"背景资料：\n{context}\n\n问题：{query}",
        )


class OpenAICompatibleImageClient:
    def generate_cover(self, *args, **kwargs): return {"url": "http://example.com/cover.png"}
    def generate_image(self, *args, **kwargs): return {"url": "http://example.com/image.png"}
    def describe_image(self, *args, **kwargs): return "图片描述内容"
