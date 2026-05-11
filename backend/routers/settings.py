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
            allow_section_split=False,
            font_scale=1.0,
            project_meta_column_width_px=88,
            project_tech_column_width_px=150,
            skill_category_column_width_em=4.6,
            skill_name_column_width_pct=24.0,
            skill_experience_column_width_pct=12.0,
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
        allow_section_split=settings.allow_section_split,
        font_scale=settings.font_scale,
        project_meta_column_width_px=settings.project_meta_column_width_px,
        project_tech_column_width_px=settings.project_tech_column_width_px,
        skill_category_column_width_em=settings.skill_category_column_width_em,
        skill_name_column_width_pct=settings.skill_name_column_width_pct,
        skill_experience_column_width_pct=settings.skill_experience_column_width_pct,
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
    settings.allow_section_split = settings_input.allow_section_split
    settings.font_scale = settings_input.font_scale
    settings.project_meta_column_width_px = settings_input.project_meta_column_width_px
    settings.project_tech_column_width_px = settings_input.project_tech_column_width_px
    settings.skill_category_column_width_em = settings_input.skill_category_column_width_em
    settings.skill_name_column_width_pct = settings_input.skill_name_column_width_pct
    settings.skill_experience_column_width_pct = settings_input.skill_experience_column_width_pct
    settings.section_order = json.dumps(settings_input.section_order, ensure_ascii=False)
    settings.section_page_breaks = json.dumps(settings_input.section_page_breaks, ensure_ascii=False)
    db.commit()
    db.refresh(settings)
    return to_response(settings)
