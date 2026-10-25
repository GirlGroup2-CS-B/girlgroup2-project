
from importlib import import_module

__all__ = [
    "Base",
    "SessionLocal",
    "engine",
    "Claim",
    "ImageSearch",
    "ImageSearchMatch",
    "ItemReport",
    "Notification",
    "User",
]


def __getattr__(name: str) -> object:
    if name in {"Base", "SessionLocal", "engine"}:
        module = import_module(".database", __name__)
    elif name in {
        "Claim",
        "ImageSearch",
        "ImageSearchMatch",
        "ItemReport",
        "Notification",
        "User",
    }:
        module = import_module(".campusfind", __name__)
    else:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
    return getattr(module, name)
