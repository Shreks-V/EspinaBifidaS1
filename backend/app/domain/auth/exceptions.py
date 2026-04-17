class AuthError(Exception):
    """Raised when authentication fails."""


class UserNotFoundError(Exception):
    """Raised when a user cannot be found."""


class ForbiddenActionError(Exception):
    """Raised when an authenticated user cannot perform an action."""
