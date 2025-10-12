from pydantic import BaseModel
from typing import Optional
<<<<<<< HEAD
=======
from datetime import datetime
>>>>>>> release/v0.0.5

class TodoBase(BaseModel):
    title: str
    description: Optional[str] = None
    completed: bool = False

class TodoCreate(TodoBase):
    pass

class Todo(TodoBase):
    id: int
<<<<<<< HEAD
=======
    created_at: datetime
    updated_at: datetime
>>>>>>> release/v0.0.5

    class Config:
        from_attributes = True