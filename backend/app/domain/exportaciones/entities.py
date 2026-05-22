from dataclasses import dataclass


@dataclass(frozen=True)
class FilePayload:
    content: bytes
    media_type: str
    filename: str
