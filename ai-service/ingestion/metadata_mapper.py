from typing import Dict, Optional


METADATA_MAP: Dict[str, Dict[str, str]] = {
    "leave_policy": {"department": "HR", "access_level": "employee"},
    "security_policy": {"department": "IT", "access_level": "employee"},
    "compliance_report": {"department": "Finance", "access_level": "manager"},
    "employee_handbook": {"department": "HR", "access_level": "employee"},
    "employees.csv": {"department": "HR", "access_level": "hr"},
    "sales_report": {"department": "Finance", "access_level": "finance"},
    "compliance_violations": {"department": "Finance", "access_level": "manager"},
    "server_logs": {"department": "IT", "access_level": "it_admin"},
    "audit_logs": {"department": "IT", "access_level": "admin"},
    "data_retention": {"department": "Legal", "access_level": "manager"},
    "incident_response": {"department": "IT", "access_level": "it_admin"},
}


def get_metadata(filename: str) -> Optional[Dict[str, str]]:
    """Return metadata dict for a filename based on pattern matching.

    Checks if any key in METADATA_MAP is a substring of the given filename.
    Returns the matching metadata dict or a default metadata dict if no match.
    """
    filename_lower = filename.lower()
    for pattern, metadata in METADATA_MAP.items():
        if pattern.lower() in filename_lower:
            return metadata.copy()
    return {"department": "General", "access_level": "employee"}
