"""
Profile router for Resume Converter application.

This module provides API endpoints for managing the single profile record (id=1)
and its associated PR highlights.
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import Profile, PrHighlight
from schemas import ProfileCreate, ProfileResponse, PrHighlightResponse


router = APIRouter(
    prefix="/api/v1",
    tags=["profile"]
)


class ProfileUpdateInput(ProfileCreate):
    """Extended input schema that includes pr_highlights for upsert operations."""
    pr_highlights: Optional[List[dict]] = None


def upsert_profile(
    db: Session,
    profile_data: ProfileCreate,
    pr_highlights_data: Optional[List[dict]] = None
) -> Profile:
    """
    Helper function to create or update the profile with id=1.
    
    This function handles both create (upsert) and update operations for the profile.
    When pr_highlights_data is provided, it replaces all existing highlights.
    
    Args:
        db: Database session
        profile_data: Profile data (name, as_of_date, self_pr)
        pr_highlights_data: Optional list of PR highlight dicts with sort_order, title, body
    
    Returns:
        The created or updated Profile object
    """
    # Try to get existing profile with id=1
    profile = db.query(Profile).filter(Profile.id == 1).first()
    
    if profile is None:
        # Create new profile with id=1
        profile = Profile(
            id=1,
            name=profile_data.name,
            as_of_date=profile_data.as_of_date,
            self_pr=profile_data.self_pr,
            updated_at=datetime.utcnow()
        )
        db.add(profile)
    else:
        # Update existing profile
        profile.name = profile_data.name
        profile.as_of_date = profile_data.as_of_date
        profile.self_pr = profile_data.self_pr
        profile.updated_at = datetime.utcnow()
    
    # Commit profile first to ensure it has an id
    db.commit()
    db.refresh(profile)
    
    # Handle pr_highlights if provided
    if pr_highlights_data is not None:
        # Delete existing highlights
        db.query(PrHighlight).filter(PrHighlight.profile_id == 1).delete()
        
        # Create new highlights
        for highlight_data in pr_highlights_data:
            highlight = PrHighlight(
                profile_id=1,
                sort_order=highlight_data.get('sort_order', 0),
                title=highlight_data.get('title'),
                body=highlight_data.get('body')
            )
            db.add(highlight)
        
        db.commit()
    
    # Refresh to load pr_highlights
    db.refresh(profile)
    return profile


@router.get(
    "/profile",
    response_model=ProfileResponse,
    summary="Get profile",
    description="Get the single profile record (id=1) including pr_highlights sorted by sort_order."
)
def get_profile(db: Session = Depends(get_db)) -> Profile:
    """
    Get the profile with id=1.
    
    Returns the single profile record with all associated PR highlights
    sorted by sort_order. If profile does not exist yet, create default id=1.
    """
    profile = (
        db.query(Profile)
        .options(joinedload(Profile.pr_highlights))
        .filter(Profile.id == 1)
        .first()
    )
    
    if profile is None:
        profile = Profile(
            id=1,
            name="",
            as_of_date=datetime.utcnow().strftime("%Y-%m-%d"),
            self_pr="",
            updated_at=datetime.utcnow(),
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    return profile


@router.put(
    "/profile",
    response_model=ProfileResponse,
    summary="Update profile",
    description="Update or create the profile with id=1 including pr_highlights."
)
def update_profile(
    profile_input: ProfileUpdateInput,
    db: Session = Depends(get_db)
) -> Profile:
    """
    Update or create the profile with id=1.
    
    This endpoint handles both creating a new profile (if none exists)
    and updating an existing one. If pr_highlights is provided in the
    request, all existing highlights are replaced with the new ones.
    
    Args:
        profile_input: Profile data including optional pr_highlights
        db: Database session
    
    Returns:
        The updated Profile object with pr_highlights
    """
    # Extract pr_highlights if provided
    pr_highlights_data = profile_input.pr_highlights
    
    # Convert ProfileUpdateInput to ProfileCreate (remove pr_highlights)
    profile_data = ProfileCreate(
        name=profile_input.name,
        as_of_date=profile_input.as_of_date,
        self_pr=profile_input.self_pr
    )
    
    # Use helper function to upsert profile
    profile = upsert_profile(db, profile_data, pr_highlights_data)
    
    return profile
