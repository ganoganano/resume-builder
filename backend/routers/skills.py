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
    SkillCategoriesReorder,
    SkillCreate,
    SkillResponse,
    SkillUpdate,
    SkillsReorder,
    SkillsByCategory,
)

router = APIRouter(prefix="/api/v1", tags=["skills"])


def normalize_skill_category_order(db: Session) -> None:
    skills = (
        db.query(Skill)
        .filter(Skill.category.is_not(None))
        .filter(Skill.name.is_not(None))
        .order_by(Skill.category_sort_order.asc(), Skill.category.asc(), Skill.sort_order.asc(), Skill.id.asc())
        .all()
    )

    category_order: dict[str, int] = {}
    next_category_order = 0
    sort_order_by_category: dict[str, int] = {}
    for skill in skills:
        category = (skill.category or "").strip()
        name = (skill.name or "").strip()
        if not category or not name:
            continue
        if category not in category_order:
            category_order[category] = next_category_order
            next_category_order += 1
        if skill.category_sort_order != category_order[category]:
            skill.category_sort_order = category_order[category]
        next_sort_order = sort_order_by_category.get(category, 0)
        if skill.sort_order != next_sort_order:
            skill.sort_order = next_sort_order
        sort_order_by_category[category] = next_sort_order + 1


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
        .order_by(Skill.category_sort_order.asc(), Skill.category.asc(), Skill.sort_order.asc(), Skill.id.asc())
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
    existing_category = db.query(Skill).filter(Skill.category == skill_data.category).order_by(Skill.id.asc()).first()
    if existing_category is None:
        max_category_sort_order_result = db.query(Skill.category_sort_order).order_by(Skill.category_sort_order.desc()).first()
        category_sort_order = (max_category_sort_order_result[0] + 1) if max_category_sort_order_result is not None else 0
    else:
        category_sort_order = existing_category.category_sort_order

    max_sort_order_result = db.query(Skill.sort_order).filter(
        Skill.category == skill_data.category
    ).order_by(Skill.sort_order.desc()).first()
    
    next_sort_order = 0
    if max_sort_order_result is not None:
        next_sort_order = max_sort_order_result[0] + 1
    
    # Create new skill record
    new_skill = Skill(
        category=skill_data.category,
        category_sort_order=category_sort_order,
        sort_order=next_sort_order,
        name=skill_data.name,
        experience=skill_data.experience,
        description=skill_data.description,
    )
    
    db.add(new_skill)
    db.commit()
    normalize_skill_category_order(db)
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
    normalize_skill_category_order(db)
    db.commit()
    
    return {"message": "Skills reordered successfully"}


@router.put("/skills/categories/reorder")
def reorder_skill_categories(
    reorder_data: SkillCategoriesReorder,
    db: Session = Depends(get_db)
) -> dict:
    skills = db.query(Skill).filter(Skill.category.is_not(None)).filter(Skill.name.is_not(None)).all()
    existing_categories = {
        (skill.category or "").strip()
        for skill in skills
        if (skill.category or "").strip() and (skill.name or "").strip()
    }
    requested_categories = [category.strip() for category in reorder_data.categories if category.strip()]

    if set(requested_categories) != existing_categories:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category list must contain every existing category exactly once",
        )

    for index, category in enumerate(requested_categories):
        db.query(Skill).filter(Skill.category == category).update(
            {"category_sort_order": index},
            synchronize_session=False,
        )

    normalize_skill_category_order(db)
    db.commit()
    return {"message": "Skill categories reordered successfully"}


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
        category_anchor = db.query(Skill).filter(
            Skill.category == skill.category,
            Skill.id != skill.id,
        ).order_by(Skill.id.asc()).first()
        if category_anchor is None:
            max_category_sort_order_result = db.query(Skill.category_sort_order).order_by(Skill.category_sort_order.desc()).first()
            skill.category_sort_order = (max_category_sort_order_result[0] + 1) if max_category_sort_order_result is not None else 0
        else:
            skill.category_sort_order = category_anchor.category_sort_order

        max_sort_order_result = db.query(Skill.sort_order).filter(
            Skill.category == skill.category,
            Skill.id != skill.id,
        ).order_by(Skill.sort_order.desc()).first()
        skill.sort_order = (max_sort_order_result[0] + 1) if max_sort_order_result is not None else 0

    db.commit()
    normalize_skill_category_order(db)
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
    normalize_skill_category_order(db)
    db.commit()
    
    return None
