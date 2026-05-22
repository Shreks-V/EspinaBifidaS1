class AuthError(Exception):
    """Raised when authentication fails."""


class UserNotFoundError(Exception):
    """Raised when a user cannot be found."""


class UserAlreadyExistsError(Exception):
    """Raised when a user with the given email already exists."""


class ForbiddenActionError(Exception):
    """Raised when an authenticated user cannot perform an action."""


class TokenDecodeError(Exception):
    """Raised when a JWT token cannot be decoded or is invalid."""
