"""Application-level exceptions."""


class AppError(Exception):
    """Base exception carrying API-safe error metadata."""

    def __init__(self, code: str, message: str, status_code: int) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


class AuthenticationError(AppError):
    """Raised when authentication fails."""

    def __init__(self, message: str = "Authentication failed") -> None:
        super().__init__("AUTH_FAILED", message, 401)


class PermissionDeniedError(AppError):
    """Raised when the current user lacks permission."""

    def __init__(self, message: str = "Permission denied") -> None:
        super().__init__("PERMISSION_DENIED", message, 403)


class NotFoundError(AppError):
    """Raised when a requested resource does not exist."""

    def __init__(self, message: str = "Resource not found") -> None:
        super().__init__("NOT_FOUND", message, 404)


class ConflictError(AppError):
    """Raised when a resource conflicts with current state."""

    def __init__(self, message: str = "Resource conflict") -> None:
        super().__init__("CONFLICT", message, 409)


class ValidationAppError(AppError):
    """Raised when a business validation fails."""

    def __init__(self, message: str = "Validation failed") -> None:
        super().__init__("VALIDATION_ERROR", message, 422)


class IntegrationError(AppError):
    """Raised when an upstream integration fails."""

    def __init__(self, message: str = "Upstream integration failed") -> None:
        super().__init__("INTEGRATION_ERROR", message, 502)
