"""
Skills router for Resume Converter application.

This module provides API endpoints for managing technical skills,
including CRUD operations and reordering functionality within categories.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Skill
from schemas import (
    SkillCreate,
    SkillResponse,
    SkillUpdate,
    SkillsReorder,
    SkillsByCategory,
)

router = APIRouter(prefix="/api/v1", tags=["skills"])


@router.get("/skills", response_model=List[SkillsByCategory])
def get_skills(db: Session = Depends(get_db)) -> List[SkillsByCategory]:
    """
    Get all skills grouped by category.
    
    Returns skills sorted by category then by sort_order within each category.
    The response groups skills into categories for easier frontend rendering.
    """
    # Get all skills sorted by category and sort_order
    skills = (
        db.query(Skill)
        .filter(Skill.category.is_not(None))
        .filter(Skill.name.is_not(None))
        .order_by(Skill.category.asc(), Skill.sort_order.asc(), Skill.id.asc())
        .all()
    )
    
    # Group skills by category
    category_map = {}
    for skill in skills:
        if not skill.category.strip() or not skill.name.strip():
            continue
        if skill.category not in category_map:
            category_map[skill.category] = []
        category_map[skill.category].append(skill)
    
    # Build response list maintaining category order
    result = []
    seen_categories = set()
    for skill in skills:
        if skill.category not in category_map:
            continue
        if skill.category not in seen_categories:
            seen_categories.add(skill.category)
            result.append(
                SkillsByCategory(
                    category=skill.category,
                    skills=category_map[skill.category]
                )
            )
    
    return result


@router.post("/skills", response_model=SkillResponse, status_code=status.HTTP_201_CREATED)
def create_skill(
    skill_data: SkillCreate,
    db: Session = Depends(get_db)
) -> Skill:
    """
    Create a new skill.
    
    Automatically assigns the next available sort_order at the end of the category.
    """
    # Get the maximum sort_order for the specified category
    max_sort_order_result = db.query(Skill.sort_order).filter(
        Skill.category == skill_data.category
    ).order_by(Skill.sort_order.desc()).first()
    
    next_sort_order = 0
    if max_sort_order_result is not None:
        next_sort_order = max_sort_order_result[0] + 1
    
    # Create new skill record
    new_skill = Skill(
        category=skill_data.category,
        sort_order=next_sort_order,
        name=skill_data.name,
        experience=skill_data.experience,
        description=skill_data.description,
    )
    
    db.add(new_skill)
    db.commit()
    db.refresh(new_skill)
    
    return new_skill


@router.put("/skills/reorder")
def reorder_skills(
    reorder_data: SkillsReorder,
    db: Session = Depends(get_db)
) -> dict:
    """
    Reorder skills within a category.
    
    Updates the sort_order of all skills based on the provided
    list of IDs. The order of IDs in the list determines the new sort_order.
    All skills must belong to the same category.
    This route must be defined before parameterized routes like /{id}.
    """
    # Validate that all provided IDs exist
    skills = db.query(Skill).filter(Skill.id.in_(reorder_data.ids)).all()
    
    existing_ids = {skill.id for skill in skills}
    
    for skill_id in reorder_data.ids:
        if skill_id not in existing_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Skill with id={skill_id} not found"
            )
    
    # Validate that all skills belong to the same category
    categories = {skill.category for skill in skills}
    if len(categories) > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All skills must belong to the same category"
        )
    
    # Update sort_order based on the provided ID order
    for index, skill_id in enumerate(reorder_data.ids):
        db.query(Skill).filter(Skill.id == skill_id).update(
            {"sort_order": index}
        )
    
    db.commit()
    
    return {"message": "Skills reordered successfully"}


@router.put("/skills/{skill_id}", response_model=SkillResponse)
def update_skill(
    skill_id: int,
    skill_data: SkillUpdate,
    db: Session = Depends(get_db)
) -> Skill:
    """
    Update an existing skill.
    
    Returns 404 if the skill with the given ID does not exist.
    """
    # Find the skill
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    
    if skill is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found"
        )
    
    # Update fields
    original_category = skill.category

    if skill_data.category is not None:
        skill.category = skill_data.category
    if skill_data.name is not None:
        skill.name = skill_data.name
    if skill_data.experience is not None:
        skill.experience = skill_data.experience
    if skill_data.description is not None:
        skill.description = skill_data.description
    
    if skill_data.category is not None and skill.category != original_category:
        max_sort_order_result = db.query(Skill.sort_order).filter(
            Skill.category == skill.category,
            Skill.id != skill.id,
        ).order_by(Skill.sort_order.desc()).first()
        skill.sort_order = (max_sort_order_result[0] + 1) if max_sort_order_result is not None else 0

    db.commit()
    db.refresh(skill)
    
    return skill


@router.delete("/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_skill(
    skill_id: int,
    db: Session = Depends(get_db)
) -> None:
    """
    Delete a skill.
    
    Returns 404 if the skill with the given ID does not exist.
    """
    # Find the skill
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    
    if skill is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found"
        )
    
    # Delete the skill
    db.delete(skill)
    db.commit()
    
    return None
