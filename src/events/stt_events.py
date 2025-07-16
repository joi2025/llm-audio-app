from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional, Type, TypeVar
import uuid

T = TypeVar('T')

@dataclass
class Event:
    id: str
    aggregate_id: str
    type: str
    data: Dict[str, Any]
    metadata: Dict[str, Any]
    timestamp: datetime

    @classmethod
    def create(cls: Type[T], aggregate_id: str, type: str, data: Dict[str, Any], metadata: Optional[Dict[str, Any]] = None) -> T:
        return cls(
            id=str(uuid.uuid4()),
            aggregate_id=aggregate_id,
            type=type,
            data=data,
            metadata=metadata or {},
            timestamp=datetime.utcnow()
        )

@dataclass
class TranscriptionStarted(Event):
    file_path: str
    model: str
    device: str

@dataclass
class TranscriptionChunkProcessed(Event):
    chunk_id: str
    duration_ms: int
    processing_time_ms: int
    text: str

@dataclass
class TranscriptionCompleted(Event):
    file_path: str
    total_duration_ms: int
    total_processing_time_ms: int
    text: str
    language: str

@dataclass
class TranscriptionFailed(Event):
    file_path: str
    error: str
