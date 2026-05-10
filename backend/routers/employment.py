"""
Employment router for Resume Converter application.

This module provides API endpoints for managing employment history records,
including CRUD operations and reordering functionality.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Employment
from schemas import (
    EmploymentCreate,
    EmploymentResponse,
    EmploymentReorder,
    EmploymentUpdate,
)

router = APIRouter(prefix="/api/v1", tags=["employment"])


@router.get("/employments", response_model=List[EmploymentResponse])
def get_employments(db: Session = Depends(get_db)) -> List[Employment]:
    """
    Get all employment records sorted by sort_order.
    
    Returns a list of all employment history entries in ascending sort_order.
    """
    employments = db.query(Employment).order_by(Employment.sort_order.asc()).all()
    return employments


@router.post("/employments", response_model=EmploymentResponse, status_code=status.HTTP_201_CREATED)
def create_employment(
    employment_data: EmploymentCreate,
    db: Session = Depends(get_db)
) -> Employment:
    """
    Create a new employment record.
    
    Automatically assigns the next available sort_order at the end of the list.
    """
    # Get the maximum sort_order to place new record at the end
    max_sort_order_result = db.query(Employment.sort_order).order_by(
        Employment.sort_order.desc()
    ).first()
    
    next_sort_order = 0
    if max_sort_order_result is not None:
        next_sort_order = max_sort_order_result[0] + 1
    
    resolved_sort_order = employment_data.sort_order if employment_data.sort_order is not None else next_sort_order

    # Create new employment record
    new_employment = Employment(
        sort_order=resolved_sort_order,
        company_name=employment_data.company_name,
        start_date=employment_data.start_date,
        end_date=employment_data.end_date,
        note=employment_data.note,
    )
    
    db.add(new_employment)
    db.commit()
    db.refresh(new_employment)
    
    return new_employment


@router.put("/employments/reorder")
def reorder_employments(
    reorder_data: EmploymentReorder,
    db: Session = Depends(get_db)
) -> dict:
    """
    Reorder employment records.
    
    Updates the sort_order of all employment records based on the provided
    list of IDs. The order of IDs in the list determines the new sort_order.
    This route must be defined before parameterized routes like /{id}.
    """
    # Validate that all provided IDs exist
    existing_employments = db.query(Employment).filter(
        Employment.id.in_(reorder_data.ids)
    ).all()
    
    existing_ids = {emp.id for emp in existing_employments}
    
    for emp_id in reorder_data.ids:
        if emp_id not in existing_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employment with id={emp_id} not found"
            )
    
    # Update sort_order based on the provided ID order
    for index, emp_id in enumerate(reorder_data.ids):
        db.query(Employment).filter(Employment.id == emp_id).update(
            {"sort_order": index}
        )
    
    db.commit()
    
    return {"message": "Employments reordered successfully"}


@router.put("/employments/{employment_id}", response_model=EmploymentResponse)
def update_employment(
    employment_id: int,
    employment_data: EmploymentUpdate,
    db: Session = Depends(get_db)
) -> Employment:
    """
    Update an existing employment record.
    
    Returns 404 if the employment record with the given ID does not exist.
    """
    # Find the employment record
    employment = db.query(Employment).filter(Employment.id == employment_id).first()
    
    if employment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found"
        )
    
    # Update fields
    if employment_data.company_name is not None:
        employment.company_name = employment_data.company_name
    if employment_data.start_date is not None:
        employment.start_date = employment_data.start_date
    if employment_data.end_date is not None:
        employment.end_date = employment_data.end_date
    if employment_data.note is not None:
        employment.note = employment_data.note
    if employment_data.sort_order is not None:
        employment.sort_order = employment_data.sort_order
    
    db.commit()
    db.refresh(employment)
    
    return employment


@router.delete("/employments/{employment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employment(
    employment_id: int,
    db: Session = Depends(get_db)
) -> None:
    """
    Delete an employment record.
    
    Related projects are automatically deleted due to cascade settings
    in the Employment model. Returns 404 if the employment record
    with the given ID does not exist.
    """
    # Find the employment record
    employment = db.query(Employment).filter(Employment.id == employment_id).first()
    
    if employment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found"
        )
    
    # Delete the employment record (cascade will delete related projects)
    db.delete(employment)
    db.commit()
    
    return None
