"""
SQLAlchemy ORM models for Resume Converter application.

This module defines all database models for managing resume data including
profile, employment history, projects, skills, and certifications.
"""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import ForeignKey, Integer, String, Text, DateTime, Float
from sqlalchemy.orm import relationship, DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


class Profile(Base):
    """
    Profile model representing user's personal information.
    
    This is a single-record model (id=1) containing basic profile information
    and self PR content.
    """
    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    as_of_date: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # YYYY-MM-DD format
    self_pr: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # Relationship to PR highlights
    pr_highlights: Mapped[List["PrHighlight"]] = relationship(
        "PrHighlight",
        back_populates="profile",
        cascade="all, delete-orphan",
        order_by="PrHighlight.sort_order",
    )

    def __repr__(self) -> str:
        return f"<Profile(id={self.id}, name='{self.name}')>"


class ResumeSettings(Base):
    """
    Single-record settings model for preview/PDF layout behavior.
    """
    __tablename__ = "resume_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    skills_on_new_page: Mapped[bool] = mapped_column(default=False, nullable=False)
    certifications_on_new_page: Mapped[bool] = mapped_column(default=False, nullable=False)
    allow_section_split: Mapped[bool] = mapped_column(default=False, nullable=False)
    font_scale: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    section_order: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default='["self_pr","employment","skills","certifications"]',
    )
    section_page_breaks: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default='{"self_pr": false, "employment": false, "skills": false, "certifications": false}',
    )

    def __repr__(self) -> str:
        return f"<ResumeSettings(id={self.id})>"


class PrHighlight(Base):
    """
    PR Highlight model representing individual self-PR items.
    
    Each highlight is associated with a profile and has a sort order
    for display purposes.
    """
    __tablename__ = "pr_highlights"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    profile_id: Mapped[int] = mapped_column(
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationship to profile
    profile: Mapped["Profile"] = relationship("Profile", back_populates="pr_highlights")

    def __repr__(self) -> str:
        return f"<PrHighlight(id={self.id}, title='{self.title}', sort_order={self.sort_order})>"


class Employment(Base):
    """
    Employment model representing work history.
    
    Tracks employment periods with company names and dates.
    Associated projects are cascade deleted when employment is deleted.
    """
    __tablename__ = "employments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    company_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    start_date: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)  # YYYY-MM format
    end_date: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)  # YYYY-MM format, NULL for current
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationship to projects - cascade delete
    projects: Mapped[List["Project"]] = relationship(
        "Project",
        back_populates="employment",
        cascade="all, delete-orphan",
        order_by="Project.sort_order",
    )

    def __repr__(self) -> str:
        return f"<Employment(id={self.id}, company_name='{self.company_name}', sort_order={self.sort_order})>"


class Project(Base):
    """
    Project model representing detailed project information.
    
    Projects are associated with an employment record and contain
    technical details stored as JSON strings for array fields.
    """
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employment_id: Mapped[int] = mapped_column(
        ForeignKey("employments.id", ondelete="CASCADE"),
        nullable=False,
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    start_date: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)  # YYYY-MM format
    end_date: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)  # YYYY-MM format, NULL for current
    title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    overview: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    role: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    team_size: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # JSON array fields stored as TEXT in SQLite
    phases: Mapped[Optional[str]] = mapped_column(Text, default="[]")  # JSON array
    tasks: Mapped[Optional[str]] = mapped_column(Text, default="[]")  # JSON array
    achievements: Mapped[Optional[str]] = mapped_column(Text, default="[]")  # JSON array
    os: Mapped[Optional[str]] = mapped_column(Text, default="[]")  # JSON array
    languages: Mapped[Optional[str]] = mapped_column(Text, default="[]")  # JSON array
    frameworks: Mapped[Optional[str]] = mapped_column(Text, default="[]")  # JSON array
    databases: Mapped[Optional[str]] = mapped_column(Text, default="[]")  # JSON array
    others: Mapped[Optional[str]] = mapped_column(Text, default="[]")  # JSON array

    # Relationship to employment
    employment: Mapped["Employment"] = relationship("Employment", back_populates="projects")

    def __repr__(self) -> str:
        return f"<Project(id={self.id}, title='{self.title}', employment_id={self.employment_id})>"


class Skill(Base):
    """
    Skill model representing technical skills.
    
    Skills are grouped by category and have a sort order for display.
    """
    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    experience: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # e.g., "4年"
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<Skill(id={self.id}, category='{self.category}', name='{self.name}')>"


class Certification(Base):
    """
    Certification model representing professional certifications.
    
    Certifications have a display order, date, and name.
    """
    __tablename__ = "certifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    date: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)  # YYYY-MM format
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    def __repr__(self) -> str:
        return f"<Certification(id={self.id}, name='{self.name}', date='{self.date}')>"
