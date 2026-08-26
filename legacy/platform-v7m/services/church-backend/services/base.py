from dataclasses import dataclass, field
from typing import Any, Optional

@dataclass
class ServiceResponse:
    """Standard response for all services."""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    meta: dict = field(default_factory=dict)

    @classmethod
    def ok(cls, data: Any = None, **meta) -> "ServiceResponse":
        return cls(success=True, data=data, meta=meta)

    @classmethod
    def fail(cls, error: str, **meta) -> "ServiceResponse":
        return cls(success=False, error=error, meta=meta)

    def __bool__(self):
        return self.success
