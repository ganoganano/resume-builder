"""
Projects router for Resume Converter application.

This module provides API endpoints for managing project records,
including CRUD operations for projects associated with employment records.
"""

import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from models import Employment, Project
from schemas import (
    ProjectCreate,
    ProjectReorder,
    ProjectResponse,
    ProjectUpdate,
)

router = APIRouter(prefix="/api/v1", tags=["projects"])


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


def serialize_json_array(value: List[str]) -> str:
    """Serialize Python list to JSON array string."""
    return json.dumps(value if value else [], ensure_ascii=False)


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


def project_to_response(project: Project) -> ProjectResponse:
    """Convert Project model to ProjectResponse schema with JSON parsing."""
    return ProjectResponse(
        id=project.id,
        employment_id=project.employment_id,
        sort_order=project.sort_order,
        start_date=project.start_date,
        end_date=project.end_date,
        title=project.title,
        overview=project.overview,
        role=project.role,
        team_size=project.team_size,
        phases=parse_json_array(project.phases),
        tasks=parse_markdown_text(project.tasks),
        achievements=parse_markdown_text(project.achievements),
        os=parse_json_array(project.os),
        languages=parse_json_array(project.languages),
        frameworks=parse_json_array(project.frameworks),
        databases=parse_json_array(project.databases),
        others=parse_json_array(project.others),
    )


@router.get("/projects", response_model=List[ProjectResponse])
def get_projects(
    employment_id: Optional[int] = Query(None, description="Filter by employment ID"),
    db: Session = Depends(get_db)
) -> List[ProjectResponse]:
    """
    Get all projects sorted by employment.sort_order then project.sort_order.
    
    Optionally filter by employment_id if provided.
    """
    query = (
        db.query(Project)
        .join(Employment)
        .order_by(Employment.sort_order.asc(), Project.sort_order.asc())
    )
    
    if employment_id is not None:
        query = query.filter(Project.employment_id == employment_id)
    
    projects = query.all()
    return [project_to_response(p) for p in projects]


@router.put("/projects/reorder")
def reorder_projects(
    reorder_data: ProjectReorder,
    db: Session = Depends(get_db)
) -> dict:
    """
    Reorder projects within one employment.

    All provided projects must exist and belong to the same employment.
    """
    projects = db.query(Project).filter(Project.id.in_(reorder_data.ids)).all()

    existing_ids = {project.id for project in projects}
    for project_id in reorder_data.ids:
        if project_id not in existing_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with id={project_id} not found"
            )

    employment_ids = {project.employment_id for project in projects}
    if len(employment_ids) > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All projects must belong to the same employment"
        )

    for index, project_id in enumerate(reorder_data.ids):
        db.query(Project).filter(Project.id == project_id).update({"sort_order": index})

    db.commit()

    return {"message": "Projects reordered successfully"}


@router.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)) -> ProjectResponse:
    """
    Get a single project by ID.
    
    Returns 404 if the project with the given ID does not exist.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found"
        )
    
    return project_to_response(project)


@router.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db)
) -> ProjectResponse:
    """
    Create a new project.
    
    Automatically assigns the next available sort_order within the specified employment.
    Validates that the employment_id exists.
    """
    # Validate that employment exists
    employment = db.query(Employment).filter(
        Employment.id == project_data.employment_id
    ).first()
    
    if employment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employment with id={project_data.employment_id} not found"
        )
    
    # Get the maximum sort_order for this employment to place new record at the end
    max_sort_order_result = (
        db.query(Project.sort_order)
        .filter(Project.employment_id == project_data.employment_id)
        .order_by(Project.sort_order.desc())
        .first()
    )
    
    next_sort_order = 0
    if max_sort_order_result is not None:
        next_sort_order = max_sort_order_result[0] + 1
    
    resolved_sort_order = project_data.sort_order if project_data.sort_order is not None else next_sort_order

    # Create new project record
    new_project = Project(
        employment_id=project_data.employment_id,
        sort_order=resolved_sort_order,
        start_date=project_data.start_date,
        end_date=project_data.end_date,
        title=project_data.title,
        overview=project_data.overview,
        role=project_data.role,
        team_size=project_data.team_size,
        phases=serialize_json_array(project_data.phases),
        tasks=project_data.tasks,
        achievements=project_data.achievements,
        os=serialize_json_array(project_data.os),
        languages=serialize_json_array(project_data.languages),
        frameworks=serialize_json_array(project_data.frameworks),
        databases=serialize_json_array(project_data.databases),
        others=serialize_json_array(project_data.others),
    )
    
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    
    return project_to_response(new_project)


@router.put("/projects/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    db: Session = Depends(get_db)
) -> ProjectResponse:
    """
    Update an existing project.
    
    Returns 404 if the project with the given ID does not exist.
    Validates that employment_id exists if it's being changed.
    """
    # Find the project
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found"
        )
    
    # Update fields
    if project_data.employment_id is not None and project_data.employment_id != project.employment_id:
        employment = db.query(Employment).filter(Employment.id == project_data.employment_id).first()
        if employment is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employment with id={project_data.employment_id} not found"
            )
        project.employment_id = project_data.employment_id
    if project_data.start_date is not None:
        project.start_date = project_data.start_date
    if project_data.end_date is not None:
        project.end_date = project_data.end_date
    if project_data.title is not None:
        project.title = project_data.title
    if project_data.overview is not None:
        project.overview = project_data.overview
    if project_data.role is not None:
        project.role = project_data.role
    if project_data.team_size is not None:
        project.team_size = project_data.team_size
    if project_data.phases is not None:
        project.phases = serialize_json_array(project_data.phases)
    if project_data.tasks is not None:
        project.tasks = project_data.tasks
    if project_data.achievements is not None:
        project.achievements = project_data.achievements
    if project_data.os is not None:
        project.os = serialize_json_array(project_data.os)
    if project_data.languages is not None:
        project.languages = serialize_json_array(project_data.languages)
    if project_data.frameworks is not None:
        project.frameworks = serialize_json_array(project_data.frameworks)
    if project_data.databases is not None:
        project.databases = serialize_json_array(project_data.databases)
    if project_data.others is not None:
        project.others = serialize_json_array(project_data.others)
    if project_data.sort_order is not None:
        project.sort_order = project_data.sort_order
    
    db.commit()
    db.refresh(project)
    
    return project_to_response(project)


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, db: Session = Depends(get_db)) -> None:
    """
    Delete a project.
    
    Returns 404 if the project with the given ID does not exist.
    """
    # Find the project
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found"
        )
    
    # Delete the project
    db.delete(project)
    db.commit()
    
    return None
