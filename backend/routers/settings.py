"""
Settings router for resume layout configuration.
"""

import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import ResumeSettings
from schemas import ResumeSettingsCreate, ResumeSettingsResponse

router = APIRouter(prefix="/api/v1", tags=["settings"])


def get_or_create_settings(db: Session) -> ResumeSettings:
    settings = db.query(ResumeSettings).filter(ResumeSettings.id == 1).first()
    if settings is None:
        settings = ResumeSettings(
            id=1,
            skills_on_new_page=False,
            certifications_on_new_page=False,
            allow_section_split=False,
            font_scale=1.0,
            section_order='["self_pr","employment","skills","certifications"]',
            section_page_breaks='{"self_pr": false, "employment": false, "skills": false, "certifications": false}',
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def to_response(settings: ResumeSettings) -> ResumeSettingsResponse:
    return ResumeSettingsResponse(
        id=settings.id,
        skills_on_new_page=settings.skills_on_new_page,
        certifications_on_new_page=settings.certifications_on_new_page,
        allow_section_split=settings.allow_section_split,
        font_scale=settings.font_scale,
        section_order=json.loads(settings.section_order or '["self_pr","employment","skills","certifications"]'),
        section_page_breaks=json.loads(
            settings.section_page_breaks
            or '{"self_pr": false, "employment": false, "skills": false, "certifications": false}'
        ),
    )


@router.get("/settings", response_model=ResumeSettingsResponse)
def get_settings(db: Session = Depends(get_db)) -> ResumeSettingsResponse:
    return to_response(get_or_create_settings(db))


@router.put("/settings", response_model=ResumeSettingsResponse)
def update_settings(
    settings_input: ResumeSettingsCreate,
    db: Session = Depends(get_db)
) -> ResumeSettingsResponse:
    settings = get_or_create_settings(db)
    settings.skills_on_new_page = settings_input.skills_on_new_page
    settings.certifications_on_new_page = settings_input.certifications_on_new_page
    settings.allow_section_split = settings_input.allow_section_split
    settings.font_scale = settings_input.font_scale
    settings.section_order = json.dumps(settings_input.section_order, ensure_ascii=False)
    settings.section_page_breaks = json.dumps(settings_input.section_page_breaks, ensure_ascii=False)
    db.commit()
    db.refresh(settings)
    return to_response(settings)
