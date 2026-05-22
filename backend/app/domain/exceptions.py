"""Domain exceptions — raised by infrastructure, caught and mapped to HTTP in presentation."""


class DomainError(Exception):
    def __init__(self, detail: str = ""):
        self.detail = detail
        super().__init__(detail)


class NotFoundError(DomainError):
    """Resource not found."""


class ValidationError(DomainError):
    """Business rule or input constraint violated."""


class ConflictError(DomainError):
    """Action conflicts with current state (duplicate, schedule overlap, etc.)."""


class InternalError(DomainError):
    """Unexpected infrastructure failure."""
