"""
Certifications router for Resume Converter application.

This module provides API endpoints for managing professional certifications,
including CRUD operations with date validation.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Certification
from schemas import (
    CertificationCreate,
    CertificationsReorder,
    CertificationResponse,
    CertificationUpdate,
)

router = APIRouter(prefix="/api/v1", tags=["certifications"])


@router.get("/certifications", response_model=List[CertificationResponse])
def get_certifications(db: Session = Depends(get_db)) -> List[Certification]:
    """
    Get all certifications.
    
    Returns certifications sorted by display order.
    """
    certifications = db.query(Certification).order_by(Certification.sort_order.asc(), Certification.id.asc()).all()
    
    return certifications


@router.post("/certifications", response_model=CertificationResponse, status_code=status.HTTP_201_CREATED)
def create_certification(
    certification_data: CertificationCreate,
    db: Session = Depends(get_db)
) -> Certification:
    """
    Create a new certification.
    
    Validates that the date is in YYYY-MM format if provided.
    Returns 422 if the date format is invalid.
    """
    # Create new certification record
    max_sort_order_result = db.query(Certification.sort_order).order_by(Certification.sort_order.desc()).first()
    next_sort_order = (max_sort_order_result[0] + 1) if max_sort_order_result is not None else 0

    new_certification = Certification(
        sort_order=next_sort_order,
        date=certification_data.date,
        name=certification_data.name,
    )
    
    db.add(new_certification)
    db.commit()
    db.refresh(new_certification)
    
    return new_certification


@router.put("/certifications/reorder")
def reorder_certifications(
    reorder_data: CertificationsReorder,
    db: Session = Depends(get_db)
) -> dict:
    """
    Reorder certifications by the provided list of IDs.
    """
    certifications = db.query(Certification).filter(Certification.id.in_(reorder_data.ids)).all()
    existing_ids = {certification.id for certification in certifications}

    for certification_id in reorder_data.ids:
        if certification_id not in existing_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Certification with id={certification_id} not found"
            )

    for index, certification_id in enumerate(reorder_data.ids):
        db.query(Certification).filter(Certification.id == certification_id).update({"sort_order": index})

    db.commit()

    return {"message": "Certifications reordered successfully"}


@router.put("/certifications/{certification_id}", response_model=CertificationResponse)
def update_certification(
    certification_id: int,
    certification_data: CertificationUpdate,
    db: Session = Depends(get_db)
) -> Certification:
    """
    Update an existing certification.
    
    Returns 404 if the certification with the given ID does not exist.
    Validates that the date is in YYYY-MM format if provided.
    Returns 422 if the date format is invalid.
    """
    # Find the certification
    certification = db.query(Certification).filter(Certification.id == certification_id).first()
    
    if certification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found"
        )
    
    # Update fields
    if certification_data.date is not None:
        certification.date = certification_data.date
    if certification_data.name is not None:
        certification.name = certification_data.name
    
    db.commit()
    db.refresh(certification)
    
    return certification


@router.delete("/certifications/{certification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_certification(
    certification_id: int,
    db: Session = Depends(get_db)
) -> None:
    """
    Delete a certification.
    
    Returns 404 if the certification with the given ID does not exist.
    """
    # Find the certification
    certification = db.query(Certification).filter(Certification.id == certification_id).first()
    
    if certification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found"
        )
    
    # Delete the certification
    db.delete(certification)
    db.commit()
    
    return None
