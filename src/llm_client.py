from __future__ import annotations
import os, asyncio, httpx, openai
from typing import AsyncIterator, Literal, Dict, Any
import structlog
from prometheus_client import Counter

# Métricas
PROMPT_TOKENS = Counter("llm_prompt_tokens_total", "Prompt tokens", ["provider"])
COMPLETION_TOKENS = Counter("llm_completion_tokens_total", "Completion tokens", ["provider"])

logger = structlog.get_logger(__name__)

class LLMClient:
    def __init__(self, provider: Literal["openai", "llama"], model: str, **kwargs):
        """
        Inicializa el cliente LLM.
        
        Args:
            provider: "openai" o "llama"
            model: Nombre del modelo a usar
            kwargs: Argumentos adicionales (base_url para llama)
        """
        self.provider = provider
        self.model = model
        self.base_url = kwargs.get("base_url") or ("http://localhost:8080" if provider == "llama" else None)
        self._client = httpx.AsyncClient(base_url=self.base_url)

    async def _retry_with_backoff(self, func, *args, **kwargs):
        """Retries 3× con backoff exponencial"""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                if attempt == max_retries - 1:
                    raise
                wait_time = 2 ** attempt
                logger.warning(
                    "Retrying request",
                    error=str(e),
                    attempt=attempt + 1,
                    wait_time=wait_time
                )
                await asyncio.sleep(wait_time)

    async def chat(self, messages: list[Dict[str, str]], max_tokens: int | None = None) -> str:
        """
        Realiza una solicitud de chat sincrónica.
        
        Args:
            messages: Lista de mensajes en formato {"role": str, "content": str}
            max_tokens: Máximo número de tokens en la respuesta
            
        Returns:
            Respuesta del modelo como string
            
        Raises:
            ValueError: Si los roles no son válidos
            Exception: Si la solicitud falla
        """
        # Validar roles
        valid_roles = ["system", "user", "assistant"]
        if not all(msg["role"] in valid_roles for msg in messages):
            raise ValueError(f"Roles válidos: {valid_roles}")

        # Preparar payload
        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": max_tokens
        }

        logger.info(
            "LLM request",
            provider=self.provider,
            model=self.model,
            num_messages=len(messages)
        )

        if self.provider == "openai":
            try:
                response = await self._retry_with_backoff(
                    openai.ChatCompletion.create,
                    **payload
                )
                PROMPT_TOKENS.labels(provider=self.provider).inc(response.usage.prompt_tokens)
                COMPLETION_TOKENS.labels(provider=self.provider).inc(response.usage.completion_tokens)
                
                logger.info(
                    "LLM response",
                    tokens=response.usage.total_tokens,
                    response_length=len(response.choices[0].message.content)
                )
                
                return response.choices[0].message.content
            except Exception as e:
                logger.error("OpenAI request failed", error=str(e))
                raise

        elif self.provider == "llama":
            try:
                response = await self._retry_with_backoff(
                    self._client.post,
                    "/v1/chat/completions",
                    json=payload
                )
                response.raise_for_status()
                
                data = response.json()
                PROMPT_TOKENS.labels(provider=self.provider).inc(data["usage"]["prompt_tokens"])
                COMPLETION_TOKENS.labels(provider=self.provider).inc(data["usage"]["completion_tokens"])
                
                logger.info(
                    "LLM response",
                    tokens=data["usage"]["total_tokens"],
                    response_length=len(data["choices"][0]["message"]["content"])
                )
                
                return data["choices"][0]["message"]["content"]
            except Exception as e:
                logger.error("Llama request failed", error=str(e))
                raise

    async def chat_stream(self, messages: list[Dict[str, str]], max_tokens: int | None = None) -> AsyncIterator[str]:
        """
        Realiza una solicitud de chat streaming.
        
        Args:
            messages: Lista de mensajes en formato {"role": str, "content": str}
            max_tokens: Máximo número de tokens en la respuesta
            
        Yields:
            Str: Partes de la respuesta del modelo
            
        Raises:
            ValueError: Si los roles no son válidos
            Exception: Si la solicitud falla
        """
        # Validar roles
        valid_roles = ["system", "user", "assistant"]
        if not all(msg["role"] in valid_roles for msg in messages):
            raise ValueError(f"Roles válidos: {valid_roles}")

        # Preparar payload
        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "stream": True
        }

        logger.info(
            "LLM stream request",
            provider=self.provider,
            model=self.model,
            num_messages=len(messages)
        )

        if self.provider == "openai":
            try:
                response = await self._retry_with_backoff(
                    openai.ChatCompletion.create,
                    **payload
                )
                
                async for chunk in response:
                    if chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
            except Exception as e:
                logger.error("OpenAI stream failed", error=str(e))
                raise

        elif self.provider == "llama":
            try:
                async with self._client.stream("POST", "/v1/chat/completions", json=payload) as response:
                    response.raise_for_status()
                    
                    async for line in response.aiter_lines():
                        if line.startswith("data:"):
                            data = line[5:]
                            if data == "[DONE]":
                                break
                                
                            try:
                                chunk = json.loads(data)
                                if chunk["choices"][0]["delta"]["content"]:
                                    yield chunk["choices"][0]["delta"]["content"]
                            except json.JSONDecodeError:
                                continue
            except Exception as e:
                logger.error("Llama stream failed", error=str(e))
                raise

__all__ = ["LLMClient"]
