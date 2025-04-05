from enum import Enum

class TriggerType(str, Enum):
    """Enum for summary trigger types."""
    ALL_SUBMITTED = "ALL_SUBMITTED"
    TIMEOUT = "TIMEOUT" 