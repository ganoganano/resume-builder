"""
PDF Service module for Resume Converter application.

This module provides functions for rendering resume data to HTML using Jinja2
and generating PDF files using WeasyPrint with Japanese font support.
"""

import json
import os
from html import escape
from datetime import datetime
from typing import Any, Dict, List, Optional

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML, CSS
from sqlalchemy.orm import Session, joinedload

from models import Profile, Employment, Project, Skill, Certification, PrHighlight, ResumeSettings

try:
    import markdown
except ModuleNotFoundError:
    markdown = None


def parse_json_array(value: Optional[str]) -> List[str]:
    """Parse JSON array string to Python list."""
    if value is None or value == "":
        return []
    try:
        result = json.loads(value)
        if isinstance(result, list):
            return result
        return []
    except (json.JSONDecodeError, TypeError):
        return []


def parse_markdown_text(value: Optional[str]) -> str:
    """Return project free text, converting legacy JSON arrays into markdown bullets."""
    if value is None:
        return ""
    text = value.strip()
    if not text:
        return ""
    try:
        parsed = json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return text
    if isinstance(parsed, list):
        lines = [str(item).strip() for item in parsed if str(item).strip()]
        return "\n".join(f"- {line}" for line in lines)
    if isinstance(parsed, str):
        return parsed.strip()
    return text


def render_markdown(text: Optional[str]) -> str:
    """Render markdown text to HTML for preview/PDF output."""
    source = (text or "").strip()
    if not source:
        return ""
    if markdown is None:
        paragraphs = [segment.strip() for segment in source.split("\n\n") if segment.strip()]
        return "".join(f"<p>{escape(paragraph).replace(chr(10), '<br>')}</p>" for paragraph in paragraphs)
    return markdown.markdown(
        source,
        extensions=["extra", "sane_lists", "nl2br"],
        output_format="html5",
    )


def parse_section_order(value: Optional[str]) -> List[str]:
    """Parse persisted section order and fall back to the default layout order."""
    default_order = ["self_pr", "employment", "skills", "certifications"]
    if value is None or value == "":
        return default_order
    try:
        parsed = json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return default_order
    if not isinstance(parsed, list):
        return default_order
    return parsed if sorted(parsed) == sorted(default_order) else default_order


def parse_section_page_breaks(value: Optional[str]) -> Dict[str, bool]:
    default_breaks = {key: False for key in SECTION_KEYS}
    if value is None or value == "":
        return default_breaks
    try:
        parsed = json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return default_breaks
    if not isinstance(parsed, dict):
        return default_breaks
    return {key: bool(parsed.get(key, False)) for key in SECTION_KEYS}


def get_resume_data(db: Session) -> Dict[str, Any]:
    """
    Gather all resume data from the database for template rendering.
    
    Queries all resume data including profile with PR highlights, employments,
    projects, skills, and certifications. Organizes them into the format needed
    for template rendering with proper sorting.
    
    Args:
        db: Database session
        
    Returns:
        Dictionary containing:
        - profile: Profile object with pr_highlights
        - employments: List of Employment objects sorted by sort_order
        - projects_by_employment: Dict mapping employment_id to list of parsed projects
        - skills_by_category: Dict mapping category to list of skills
        - certifications: List of Certification objects sorted by date
    """
    # Get profile with pr_highlights sorted by sort_order
    profile = (
        db.query(Profile)
        .options(joinedload(Profile.pr_highlights))
        .filter(Profile.id == 1)
        .first()
    )
    
    if profile is None:
        profile = Profile(id=1, name="", as_of_date=datetime.now().strftime("%Y-%m-%d"), self_pr="")
        pr_highlights = []
    else:
        # Sort pr_highlights by sort_order
        pr_highlights = sorted(profile.pr_highlights, key=lambda x: x.sort_order)

    settings = db.query(ResumeSettings).filter(ResumeSettings.id == 1).first()
    if settings is None:
        settings = ResumeSettings(
            id=1,
            allow_section_split=False,
            font_scale=1.0,
            section_order='["self_pr","employment","skills","certifications"]',
            section_page_breaks='{"self_pr": false, "employment": false, "skills": false, "certifications": false}',
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)

    section_order = parse_section_order(settings.section_order)
    
    # Get employments sorted by sort_order
    employments = db.query(Employment).order_by(Employment.sort_order.asc()).all()
    
    # Get all projects and organize by employment_id
    # Parse JSON array fields for each project
    projects_by_employment: Dict[int, List[Dict[str, Any]]] = {}
    all_projects = db.query(Project).order_by(Project.sort_order.asc()).all()
    
    for project in all_projects:
        # Parse JSON fields
        parsed_project = {
            'id': project.id,
            'employment_id': project.employment_id,
            'sort_order': project.sort_order,
            'start_date': project.start_date,
            'end_date': project.end_date,
            'title': project.title,
            'overview': project.overview,
            'role': project.role,
            'team_size': project.team_size,
            'phases': parse_json_array(project.phases),
            'tasks': parse_markdown_text(project.tasks),
            'tasks_html': render_markdown(parse_markdown_text(project.tasks)),
            'achievements': parse_markdown_text(project.achievements),
            'achievements_html': render_markdown(parse_markdown_text(project.achievements)),
            'os': parse_json_array(project.os),
            'languages': parse_json_array(project.languages),
            'frameworks': parse_json_array(project.frameworks),
            'databases': parse_json_array(project.databases),
            'others': parse_json_array(project.others),
        }
        
        if project.employment_id not in projects_by_employment:
            projects_by_employment[project.employment_id] = []
        projects_by_employment[project.employment_id].append(parsed_project)
    
    # Get skills and organize by category, sorted by category and sort_order
    skills_by_category: Dict[str, List[Dict[str, Any]]] = {}
    skills = db.query(Skill).order_by(
        Skill.category_sort_order.asc(),
        Skill.category.asc(),
        Skill.sort_order.asc(),
        Skill.id.asc(),
    ).all()

    for skill in skills:
        category = (skill.category or "").strip()
        name = (skill.name or "").strip()
        if not category or not name:
            continue
        skill_dict = {
            'id': skill.id,
            'category': category,
            'sort_order': skill.sort_order,
            'name': name,
            'experience': skill.experience,
            'description': skill.description,
        }

        if category not in skills_by_category:
            skills_by_category[category] = []
        skills_by_category[category].append(skill_dict)
    
    # Get certifications in display order
    certifications = db.query(Certification).order_by(
        Certification.sort_order.asc(),
        Certification.id.asc()
    ).all()
    
    certifications_list = [
        {
            'id': cert.id,
            'date': cert.date,
            'name': cert.name,
        }
        for cert in certifications
    ]
    
    # Format pr_highlights for template
    pr_highlights_list = [
        {
            'id': h.id,
            'sort_order': h.sort_order,
            'title': h.title,
            'body': h.body,
        }
        for h in pr_highlights
    ]
    
    return {
        'profile': profile,
        'display_as_of_date': profile.as_of_date or datetime.now().strftime("%Y-%m-%d"),
        'self_pr_html': render_markdown(profile.self_pr),
        'pr_highlights': pr_highlights_list,
        'settings': {
            'allow_section_split': settings.allow_section_split,
            'font_scale': settings.font_scale,
            'section_order': section_order,
            'section_page_breaks': parse_section_page_breaks(getattr(settings, "section_page_breaks", None)),
        },
        'employments': employments,
        'projects_by_employment': projects_by_employment,
        'skills_by_category': skills_by_category,
        'certifications': certifications_list,
    }


def render_resume_html(context: Dict[str, Any]) -> str:
    """
    Render the resume template with the provided context.
    
    Uses Jinja2 to render the general.html template with all resume data.
    
    Args:
        context: Dictionary containing resume data including:
            - profile: Profile object with pr_highlights
            - employments: List of Employment objects
            - projects_by_employment: Dict of projects by employment_id
            - skills_by_category: Dict of skills by category
            - certifications: List of certifications
        
    Returns:
        Rendered HTML string
    """
    # Set up Jinja2 environment
    template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'templates')
    env = Environment(
        loader=FileSystemLoader(template_dir),
        autoescape=select_autoescape(['html', 'xml'])
    )
    
    # Load template
    template = env.get_template('general.html')
    
    # Render template with context
    html_content = template.render(**context)
    
    return html_content


def generate_resume_pdf(context: Dict[str, Any]) -> bytes:
    """
    Generate a PDF from the resume data.
    
    Renders the HTML template and converts it to PDF using WeasyPrint.
    Japanese text is supported with Noto Sans JP font.
    
    Args:
        context: Dictionary containing resume data (same format as render_resume_html)
        
    Returns:
        PDF content as bytes
    """
    # Render HTML
    html_content = render_resume_html(context)
    
    # Define CSS for Japanese font support
    font_css = CSS(string='''
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap');
        
        * {
            font-family: 'Noto Sans JP', sans-serif !important;
        }
        
        body {
            font-family: 'Noto Sans JP', sans-serif !important;
        }
    ''')
    
    # Generate PDF using WeasyPrint
    html = HTML(string=html_content)
    
    # Generate PDF with font CSS
    pdf_bytes = html.write_pdf(stylesheets=[font_css])
    
    return pdf_bytes
SECTION_KEYS = ("self_pr", "employment", "skills", "certifications")
