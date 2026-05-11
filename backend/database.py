"""Database setup for FastAPI + SQLite."""

import os
from datetime import datetime
from typing import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session, sessionmaker

from models import Base, Certification, Profile, ResumeSettings, Skill

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./resume.db")

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    Dependency function for FastAPI to get a database session.
    Yields a session and ensures it's closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """
    Initialize the database by creating all tables.
    Should be called once at application startup.
    """
    # Keep imports to ensure mapper registration side effects
    from models import Certification, Employment, PrHighlight, Project, ResumeSettings, Skill  # noqa: F401

    Base.metadata.create_all(bind=engine)


def create_default_profile() -> None:
    """
    Create a default Profile record with id=1 if none exists.
    Should be called after init_db() to ensure tables exist.
    """
    db = SessionLocal()
    try:
        # Check if a profile already exists
        existing_profile = db.query(Profile).filter(Profile.id == 1).first()
        
        if existing_profile is None:
            default_profile = Profile(
                id=1,
                name="",
                as_of_date=datetime.now().strftime("%Y-%m-%d"),
                self_pr="",
            )
            db.add(default_profile)
            db.commit()
            print("Default profile created with id=1")
        else:
            print("Default profile already exists")
    except Exception as e:
        db.rollback()
        print(f"Error creating default profile: {e}")
        raise
    finally:
        db.close()


def create_default_settings() -> None:
    """
    Create the single ResumeSettings record with id=1 if none exists.
    """
    db = SessionLocal()
    try:
        existing_settings = db.query(ResumeSettings).filter(ResumeSettings.id == 1).first()
        if existing_settings is None:
            db.add(
                ResumeSettings(
                    id=1,
                    allow_section_split=False,
                    font_scale=1.0,
                    section_order='["self_pr","employment","skills","certifications"]',
                    section_page_breaks='{"self_pr": false, "employment": false, "skills": false, "certifications": false}',
                )
            )
            db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def cleanup_invalid_skills() -> None:
    """
    Remove invalid skill rows and normalize sort_order within each category.

    Older frontend behavior allowed creating rows with blank category/name.
    Those rows should not survive because they become uneditable noise in the UI
    and can leak into preview output.
    """
    db = SessionLocal()
    try:
        skills = db.query(Skill).order_by(
            Skill.category_sort_order.asc(),
            Skill.category.asc(),
            Skill.sort_order.asc(),
            Skill.id.asc(),
        ).all()

        valid_skills: list[Skill] = []
        invalid_skills: list[Skill] = []
        for skill in skills:
            category = (skill.category or "").strip()
            name = (skill.name or "").strip()
            if not category or not name:
                invalid_skills.append(skill)
                continue

            if skill.category != category:
                skill.category = category
            if skill.name != name:
                skill.name = name
            if skill.experience is not None:
                skill.experience = skill.experience.strip() or None
            if skill.description is not None:
                skill.description = skill.description.strip() or None

            valid_skills.append(skill)

        for skill in invalid_skills:
            db.delete(skill)

        sort_index_by_category: dict[str, int] = {}
        category_order: dict[str, int] = {}
        next_category_order = 0
        for skill in valid_skills:
            category = skill.category
            if category not in category_order:
                category_order[category] = next_category_order
                next_category_order += 1
            if skill.category_sort_order != category_order[category]:
                skill.category_sort_order = category_order[category]
            next_sort_order = sort_index_by_category.get(category, 0)
            if skill.sort_order != next_sort_order:
                skill.sort_order = next_sort_order
            sort_index_by_category[category] = next_sort_order + 1

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def ensure_certification_sort_order_column() -> None:
    """
    Add certifications.sort_order for existing SQLite databases when missing.
    """
    with engine.begin() as connection:
        columns = connection.execute(text("PRAGMA table_info(certifications)")).fetchall()
        column_names = {column[1] for column in columns}
        if "sort_order" not in column_names:
            connection.execute(text("ALTER TABLE certifications ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0"))


def ensure_resume_settings_columns() -> None:
    """
    Add newly introduced columns to resume_settings for existing SQLite databases.
    """
    with engine.begin() as connection:
        columns = connection.execute(text("PRAGMA table_info(resume_settings)")).fetchall()
        column_names = {column[1] for column in columns}
        if "allow_section_split" not in column_names:
            connection.execute(text("ALTER TABLE resume_settings ADD COLUMN allow_section_split INTEGER NOT NULL DEFAULT 0"))
        if "font_scale" not in column_names:
            connection.execute(text("ALTER TABLE resume_settings ADD COLUMN font_scale REAL NOT NULL DEFAULT 1.0"))
        if "section_page_breaks" not in column_names:
            connection.execute(
                text(
                    """ALTER TABLE resume_settings
                    ADD COLUMN section_page_breaks TEXT NOT NULL
                    DEFAULT '{"self_pr": false, "employment": false, "skills": false, "certifications": false}'"""
                )
            )


def drop_legacy_resume_settings_columns() -> None:
    """
    Remove obsolete resume_settings columns kept from the old per-section page break UI.
    """
    with engine.begin() as connection:
        columns = connection.execute(text("PRAGMA table_info(resume_settings)")).fetchall()
        column_names = {column[1] for column in columns}
        for column_name in ("skills_on_new_page", "certifications_on_new_page"):
            if column_name not in column_names:
                continue
            try:
                connection.execute(text(f"ALTER TABLE resume_settings DROP COLUMN {column_name}"))
            except OperationalError:
                # Older SQLite builds may not support DROP COLUMN.
                # In that case the application model and API already ignore these fields.
                pass


def ensure_skill_category_sort_order_column() -> None:
    """
    Add skills.category_sort_order for existing SQLite databases when missing.
    """
    with engine.begin() as connection:
        columns = connection.execute(text("PRAGMA table_info(skills)")).fetchall()
        column_names = {column[1] for column in columns}
        if "category_sort_order" not in column_names:
            connection.execute(text("ALTER TABLE skills ADD COLUMN category_sort_order INTEGER NOT NULL DEFAULT 0"))


def normalize_certifications_order() -> None:
    """
    Initialize and compact certification sort_order values.

    Existing rows keep the historical date/name order on first migration.
    """
    db = SessionLocal()
    try:
        certifications = db.query(Certification).order_by(
            Certification.sort_order.asc(),
            Certification.date.asc().nullslast(),
            Certification.name.asc(),
            Certification.id.asc(),
        ).all()

        needs_initialization = all((cert.sort_order or 0) == 0 for cert in certifications) and len(certifications) > 1
        if needs_initialization:
            certifications = db.query(Certification).order_by(
                Certification.date.asc().nullslast(),
                Certification.name.asc(),
                Certification.id.asc(),
            ).all()

        for index, certification in enumerate(certifications):
            if certification.sort_order != index:
                certification.sort_order = index

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def setup_database() -> None:
    """
    Complete database setup including table creation and default data insertion.
    Should be called once at application startup.
    """
    init_db()
    ensure_resume_settings_columns()
    drop_legacy_resume_settings_columns()
    ensure_skill_category_sort_order_column()
    ensure_certification_sort_order_column()
    create_default_profile()
    create_default_settings()
    cleanup_invalid_skills()
    normalize_certifications_order()
