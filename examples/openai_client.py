#!/usr/bin/env python3
"""Minimal OpenAI SDK client against ChainGPT-LiteLLM."""
from openai import OpenAI

client = OpenAI(base_url="http://127.0.0.1:8787/v1", api_key="local")
r = client.chat.completions.create(
    model="general_assistant",
    messages=[{"role": "user", "content": "What is a reentrancy guard? One sentence."}],
)
print(r.choices[0].message.content)
