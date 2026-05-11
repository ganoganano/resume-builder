"""
Export router for Resume Converter application.

This module provides API endpoints for exporting resume data as HTML preview
and PDF/JSON download plus JSON import.
"""

import json
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from models import Certification, Employment, Profile, Project, PrHighlight, ResumeSettings, Skill
from services import pdf_service


router = APIRouter(
    prefix="/api/v1",
    tags=["export"]
)


def serialize_project_array_field(value: object) -> str:
    """
    Accept either persisted JSON text or a plain array and normalize to DB text.
    """
    if value is None:
        return "[]"
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return "[]"
        try:
            parsed = json.loads(stripped)
        except json.JSONDecodeError:
            return json.dumps([stripped], ensure_ascii=False)
        if isinstance(parsed, list):
            return json.dumps(parsed, ensure_ascii=False)
        return json.dumps([str(parsed)], ensure_ascii=False)
    if isinstance(value, list):
        return json.dumps(value, ensure_ascii=False)
    return json.dumps([str(value)], ensure_ascii=False)


def normalize_project_text_field(value: object) -> str:
    """
    Accept either markdown text or legacy list data for free-text project fields.
    """
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        lines = [str(item).strip() for item in value if str(item).strip()]
        return "\n".join(f"- {line}" for line in lines)
    return str(value)


def build_backup_payload(db: Session) -> dict:
    profile = db.query(Profile).filter(Profile.id == 1).first()
    settings = db.query(ResumeSettings).filter(ResumeSettings.id == 1).first()
    employments = db.query(Employment).order_by(Employment.sort_order.asc(), Employment.id.asc()).all()
    projects = db.query(Project).order_by(Project.employment_id.asc(), Project.sort_order.asc(), Project.id.asc()).all()
    skills = db.query(Skill).order_by(Skill.category.asc(), Skill.sort_order.asc(), Skill.id.asc()).all()
    certifications = db.query(Certification).order_by(Certification.sort_order.asc(), Certification.id.asc()).all()
    pr_highlights = db.query(PrHighlight).order_by(PrHighlight.sort_order.asc(), PrHighlight.id.asc()).all()

    return {
        "version": 1,
        "profile": {
            "id": 1,
            "name": profile.name if profile else "",
            "as_of_date": profile.as_of_date if profile else "",
            "self_pr": profile.self_pr if profile else "",
            "pr_highlights": [
                {
                    "id": highlight.id,
                    "sort_order": highlight.sort_order,
                    "title": highlight.title,
                    "body": highlight.body,
                }
                for highlight in pr_highlights
            ],
        },
        "settings": {
            "id": 1,
            "allow_section_split": settings.allow_section_split if settings else False,
            "font_scale": settings.font_scale if settings else 1.0,
            "section_order": json.loads(settings.section_order or '["self_pr","employment","skills","certifications"]')
            if settings else ["self_pr", "employment", "skills", "certifications"],
            "section_page_breaks": json.loads(
                settings.section_page_breaks
                or '{"self_pr": false, "employment": false, "skills": false, "certifications": false}'
            ) if settings else {"self_pr": False, "employment": False, "skills": False, "certifications": False},
        },
        "employments": [
            {
                "id": employment.id,
                "sort_order": employment.sort_order,
                "company_name": employment.company_name,
                "start_date": employment.start_date,
                "end_date": employment.end_date,
                "note": employment.note,
            }
            for employment in employments
        ],
        "projects": [
            {
                "id": project.id,
                "employment_id": project.employment_id,
                "sort_order": project.sort_order,
                "start_date": project.start_date,
                "end_date": project.end_date,
                "title": project.title,
                "overview": project.overview,
                "role": project.role,
                "team_size": project.team_size,
                "phases": project.phases,
                "tasks": project.tasks,
                "achievements": project.achievements,
                "os": project.os,
                "languages": project.languages,
                "frameworks": project.frameworks,
                "databases": project.databases,
                "others": project.others,
            }
            for project in projects
        ],
        "skills": [
            {
                "id": skill.id,
                "category": skill.category,
                "sort_order": skill.sort_order,
                "name": skill.name,
                "experience": skill.experience,
                "description": skill.description,
            }
            for skill in skills
        ],
        "certifications": [
            {
                "id": certification.id,
                "sort_order": certification.sort_order,
                "date": certification.date,
                "name": certification.name,
            }
            for certification in certifications
        ],
    }


def restore_backup_payload(db: Session, payload: dict) -> None:
    if not isinstance(payload, dict):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid backup format")

    employments = payload.get("employments")
    projects = payload.get("projects")
    skills = payload.get("skills")
    certifications = payload.get("certifications")
    profile = payload.get("profile", {})
    settings = payload.get("settings", {})

    required_lists = [employments, projects, skills, certifications]
    if any(not isinstance(value, list) for value in required_lists):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid backup format")

    db.query(Project).delete()
    db.query(Skill).delete()
    db.query(Certification).delete()
    db.query(Employment).delete()
    db.query(PrHighlight).delete()
    db.query(Profile).delete()
    db.query(ResumeSettings).delete()
    db.commit()

    db.add(
        Profile(
            id=1,
            name=profile.get("name", ""),
            as_of_date=profile.get("as_of_date") or "",
            self_pr=profile.get("self_pr", ""),
        )
    )
    db.add(
        ResumeSettings(
            id=1,
            allow_section_split=bool(settings.get("allow_section_split", False)),
            font_scale=float(settings.get("font_scale", 1.0)),
            section_order=json.dumps(
                settings.get("section_order", ["self_pr", "employment", "skills", "certifications"]),
                ensure_ascii=False,
            ),
            section_page_breaks=json.dumps(
                settings.get(
                    "section_page_breaks",
                    {"self_pr": False, "employment": False, "skills": False, "certifications": False},
                ),
                ensure_ascii=False,
            ),
        )
    )
    db.flush()

    for highlight in profile.get("pr_highlights", []):
        db.add(
            PrHighlight(
                id=highlight.get("id"),
                profile_id=1,
                sort_order=highlight.get("sort_order", 0),
                title=highlight.get("title"),
                body=highlight.get("body"),
            )
        )

    for employment in employments:
        db.add(
            Employment(
                id=employment.get("id"),
                sort_order=employment.get("sort_order", 0),
                company_name=employment.get("company_name"),
                start_date=employment.get("start_date"),
                end_date=employment.get("end_date"),
                note=employment.get("note"),
            )
        )

    for project in projects:
        db.add(
            Project(
                id=project.get("id"),
                employment_id=project.get("employment_id"),
                sort_order=project.get("sort_order", 0),
                start_date=project.get("start_date"),
                end_date=project.get("end_date"),
                title=project.get("title"),
                overview=project.get("overview"),
                role=project.get("role"),
                team_size=project.get("team_size"),
                phases=serialize_project_array_field(project.get("phases")),
                tasks=normalize_project_text_field(project.get("tasks")),
                achievements=normalize_project_text_field(project.get("achievements")),
                os=serialize_project_array_field(project.get("os")),
                languages=serialize_project_array_field(project.get("languages")),
                frameworks=serialize_project_array_field(project.get("frameworks")),
                databases=serialize_project_array_field(project.get("databases")),
                others=serialize_project_array_field(project.get("others")),
            )
        )

    for skill in skills:
        db.add(
            Skill(
                id=skill.get("id"),
                category=skill.get("category", ""),
                sort_order=skill.get("sort_order", 0),
                name=skill.get("name", ""),
                experience=skill.get("experience"),
                description=skill.get("description"),
            )
        )

    for certification in certifications:
        db.add(
            Certification(
                id=certification.get("id"),
                sort_order=certification.get("sort_order", 0),
                date=certification.get("date"),
                name=certification.get("name", ""),
            )
        )

    db.commit()


@router.get(
    "/export/preview",
    response_class=HTMLResponse,
    summary="Get HTML preview",
    description="Generate an HTML preview of the resume using Jinja2 template rendering."
)
def export_preview(db: Session = Depends(get_db)) -> HTMLResponse:
    """
    Generate an HTML preview of the resume.
    
    Renders the resume data using the Jinja2 template and returns it as HTML.
    This can be used to preview the resume before downloading as PDF.
    
    Args:
        db: Database session
        
    Returns:
        HTMLResponse with rendered HTML content
    """
    try:
        # Get resume data from database
        context = pdf_service.get_resume_data(db)
        
        # Generate HTML content
        html_content = pdf_service.render_resume_html(context)
        
        return HTMLResponse(content=html_content, status_code=status.HTTP_200_OK)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate preview: {str(e)}"
        )


@router.get(
    "/export/pdf",
    summary="Download PDF",
    description="Generate and download the resume as a PDF file."
)
def export_pdf(db: Session = Depends(get_db)) -> StreamingResponse:
    """
    Generate and download the resume as PDF.
    
    Generates a PDF file using WeasyPrint with the resume data and returns it
    as a downloadable file.
    
    Args:
        db: Database session
        
    Returns:
        StreamingResponse with PDF content and appropriate headers
    """
    try:
        # Get resume data from database
        context = pdf_service.get_resume_data(db)
        
        # Generate PDF content
        pdf_bytes = pdf_service.generate_resume_pdf(context)
        
        # Create a BytesIO stream
        pdf_stream = BytesIO(pdf_bytes)
        
        return StreamingResponse(
            pdf_stream,
            media_type="application/pdf",
            headers={
                "Content-Disposition": 'attachment; filename="resume.pdf"'
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF: {str(e)}"
        )


@router.get(
    "/export/json",
    summary="Download JSON backup",
    description="Download all resume data as a JSON backup file."
)
def export_json(db: Session = Depends(get_db)) -> StreamingResponse:
    payload = build_backup_payload(db)
    content = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
    return StreamingResponse(
        BytesIO(content),
        media_type="application/json",
        headers={
            "Content-Disposition": 'attachment; filename="resume-backup.json"'
        },
    )


@router.post(
    "/import/json",
    summary="Import JSON backup",
    description="Replace all current resume data with the provided JSON backup."
)
def import_json(payload: dict, db: Session = Depends(get_db)) -> dict:
    try:
        restore_backup_payload(db, payload)
        return {"message": "Backup imported successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to import backup: {str(e)}"
        )
