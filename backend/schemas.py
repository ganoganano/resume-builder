"""
Pydantic schemas for Resume Converter application.

This module defines all request/response schemas for API validation and serialization.
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


# =============================================================================
# Profile Schemas
# =============================================================================

class ProfileBase(BaseModel):
    """Base schema for Profile data."""
    name: Optional[str] = None
    as_of_date: Optional[str] = None  # YYYY-MM-DD format
    self_pr: Optional[str] = None

    @field_validator('as_of_date')
    @classmethod
    def validate_as_of_date(cls, v: Optional[str]) -> Optional[str]:
        """Validate YYYY-MM-DD format for as_of_date."""
        if v is None or v == "":
            return v
        import re
        if not re.match(r'^\d{4}-\d{2}-\d{2}$', v):
            raise ValueError('as_of_date must be in YYYY-MM-DD format')
        return v


class ProfileCreate(ProfileBase):
    """Schema for creating a new profile."""
    pass


class ProfileResponse(ProfileBase):
    """Schema for profile response data."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    updated_at: datetime
    pr_highlights: List["PrHighlightResponse"] = []


# =============================================================================
# PR Highlight Schemas
# =============================================================================

class PrHighlightBase(BaseModel):
    """Base schema for PR Highlight data."""
    sort_order: int = 0
    title: Optional[str] = None
    body: Optional[str] = None


class PrHighlightCreate(PrHighlightBase):
    """Schema for creating a new PR highlight."""
    pass


class PrHighlightUpdate(PrHighlightBase):
    """Schema for updating a PR highlight."""
    pass


class PrHighlightResponse(PrHighlightBase):
    """Schema for PR highlight response data."""
    model_config = ConfigDict(from_attributes=True)

    id: int


# =============================================================================
# Employment Schemas
# =============================================================================

class EmploymentBase(BaseModel):
    """Base schema for Employment data."""
    sort_order: Optional[int] = None
    company_name: Optional[str] = None
    start_date: Optional[str] = None  # YYYY-MM format
    end_date: Optional[str] = None    # YYYY-MM format, NULL for current
    note: Optional[str] = None

    @field_validator('start_date', 'end_date')
    @classmethod
    def validate_date(cls, v: Optional[str]) -> Optional[str]:
        """Validate YYYY-MM format for employment dates."""
        if v is None or v == "":
            return v
        import re
        if not re.match(r'^\d{4}-\d{2}$', v):
            raise ValueError('Date must be in YYYY-MM format')
        return v


class EmploymentCreate(EmploymentBase):
    """Schema for creating a new employment record."""
    pass


class EmploymentUpdate(EmploymentBase):
    """Schema for updating an employment record."""
    pass


class EmploymentResponse(EmploymentBase):
    """Schema for employment response data."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    sort_order: int


class EmploymentReorder(BaseModel):
    """Schema for reordering employment records."""
    ids: List[int]


# =============================================================================
# Project Schemas
# =============================================================================

class ProjectBase(BaseModel):
    """Base schema for Project data."""
    sort_order: Optional[int] = None
    start_date: Optional[str] = None  # YYYY-MM format
    end_date: Optional[str] = None    # YYYY-MM format, NULL for current
    title: Optional[str] = None
    overview: Optional[str] = None
    role: Optional[str] = None
    team_size: Optional[str] = None
    phases: List[str] = []
    tasks: Optional[str] = None
    achievements: Optional[str] = None
    os: List[str] = []
    languages: List[str] = []
    frameworks: List[str] = []
    databases: List[str] = []
    others: List[str] = []

    @field_validator('start_date', 'end_date')
    @classmethod
    def validate_date(cls, v: Optional[str]) -> Optional[str]:
        """Validate YYYY-MM format for project dates."""
        if v is None or v == "":
            return v
        import re
        if not re.match(r'^\d{4}-\d{2}$', v):
            raise ValueError('Date must be in YYYY-MM format')
        return v

    @field_validator('title', 'overview', 'role', 'team_size', 'tasks', 'achievements')
    @classmethod
    def normalize_optional_text(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return v.strip() or None


class ProjectCreate(ProjectBase):
    """Schema for creating a new project."""
    employment_id: int


class ProjectUpdate(ProjectBase):
    """Schema for updating a project."""
    employment_id: Optional[int] = None


class ProjectResponse(ProjectBase):
    """Schema for project response data."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    employment_id: int
    sort_order: int


class ProjectReorder(BaseModel):
    """Schema for reordering projects within one employment."""
    ids: List[int]


# =============================================================================
# Skill Schemas
# =============================================================================

class SkillCategory(str, Enum):
    """Enumeration of skill categories."""
    OS = "OS"
    LANGUAGE = "LANGUAGE"
    FRAMEWORK = "FRAMEWORK"
    DATABASE = "DATABASE"
    CLOUD = "CLOUD"
    TOOL = "TOOL"
    OTHER = "OTHER"


class SkillBase(BaseModel):
    """Base schema for Skill data."""
    category: str
    name: str
    experience: Optional[str] = None  # e.g., "4年"
    description: Optional[str] = None

    @field_validator('category', 'name')
    @classmethod
    def validate_required_text(cls, v: str) -> str:
        value = v.strip()
        if not value:
            raise ValueError('Field must not be empty')
        return value

    @field_validator('experience', 'description')
    @classmethod
    def normalize_optional_text(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        value = v.strip()
        return value or None


class SkillCreate(SkillBase):
    """Schema for creating a new skill."""
    pass


class SkillUpdate(SkillBase):
    """Schema for updating a skill."""
    category: Optional[str] = None
    name: Optional[str] = None

    @field_validator('category', 'name')
    @classmethod
    def validate_optional_required_text(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        value = v.strip()
        if not value:
            raise ValueError('Field must not be empty')
        return value


class SkillResponse(SkillBase):
    """Schema for skill response data."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    sort_order: int


class SkillsReorder(BaseModel):
    """Schema for reordering skills within a category."""
    ids: List[int]


class SkillsByCategory(BaseModel):
    """Schema for skills grouped by category."""
    category: str
    skills: List[SkillResponse]


# =============================================================================
# Certification Schemas
# =============================================================================

class CertificationBase(BaseModel):
    """Base schema for Certification data."""
    date: Optional[str] = None  # YYYY-MM format
    name: str

    @field_validator('date')
    @classmethod
    def validate_date(cls, v: Optional[str]) -> Optional[str]:
        """Validate YYYY-MM format for certification date."""
        if v is None or v == "":
            return v
        import re
        if not re.match(r'^\d{4}-\d{2}$', v):
            raise ValueError('Date must be in YYYY-MM format')
        return v


class CertificationCreate(CertificationBase):
    """Schema for creating a new certification."""
    pass


class CertificationUpdate(CertificationBase):
    """Schema for updating a certification."""
    pass


class CertificationResponse(CertificationBase):
    """Schema for certification response data."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    sort_order: int


class CertificationsReorder(BaseModel):
    """Schema for reordering certifications."""
    ids: List[int]


# =============================================================================
# Settings Schemas
# =============================================================================

SECTION_KEYS = ("self_pr", "employment", "skills", "certifications")


class ResumeSettingsBase(BaseModel):
    """Base schema for resume layout settings."""
    skills_on_new_page: bool = False
    certifications_on_new_page: bool = False
    allow_section_split: bool = False
    font_scale: float = 1.0
    section_order: List[str] = Field(default_factory=lambda: list(SECTION_KEYS))
    section_page_breaks: dict[str, bool] = Field(default_factory=lambda: {key: False for key in SECTION_KEYS})

    @field_validator('section_order')
    @classmethod
    def validate_section_order(cls, v: List[str]) -> List[str]:
        if sorted(v) != sorted(SECTION_KEYS):
            raise ValueError(f'section_order must contain exactly: {", ".join(SECTION_KEYS)}')
        return v

    @field_validator("section_page_breaks")
    @classmethod
    def validate_section_page_breaks(cls, v: dict[str, bool]) -> dict[str, bool]:
        normalized = {key: bool(v.get(key, False)) for key in SECTION_KEYS}
        extra_keys = set(v.keys()) - set(SECTION_KEYS)
        if extra_keys:
            raise ValueError(f'section_page_breaks contains unknown keys: {", ".join(sorted(extra_keys))}')
        return normalized

    @field_validator('font_scale')
    @classmethod
    def validate_font_scale(cls, v: float) -> float:
        if v < 0.85 or v > 1.25:
            raise ValueError('font_scale must be between 0.85 and 1.25')
        return v


class ResumeSettingsCreate(ResumeSettingsBase):
    """Schema for creating or updating resume settings."""
    pass


class ResumeSettingsResponse(ResumeSettingsBase):
    """Schema for resume settings response data."""
    model_config = ConfigDict(from_attributes=True)

    id: int


# =============================================================================
# Export Schemas
# =============================================================================

class ExportContext(BaseModel):
    """Schema for template export context data."""
    profile: ProfileResponse
    employments: List[EmploymentResponse]
    projects_by_employment: dict
    skills_by_category: dict
    certifications: List[CertificationResponse]
    settings: ResumeSettingsResponse
