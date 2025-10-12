from fastapi import APIRouter, HTTPException
from ..schemas import Item, ItemCreate, Todo, TodoCreate
<<<<<<< HEAD
=======
from datetime import datetime
>>>>>>> release/v0.0.5

router = APIRouter()

# In-memory storage for demo purposes
# In production, use a proper database
items_db = []
item_id_counter = 1

<<<<<<< HEAD
# Todo storage for Vue apps
=======
>>>>>>> release/v0.0.5
todos_db = []
todo_id_counter = 1

@router.get("/items", response_model=list[Item])
async def get_items():
    """Get all items"""
    return items_db

@router.get("/items/{item_id}", response_model=Item)
async def get_item(item_id: int):
    """Get a specific item by ID"""
    for item in items_db:
        if item.id == item_id:
            return item
    raise HTTPException(status_code=404, detail="Item not found")

@router.post("/items", response_model=Item)
async def create_item(item: ItemCreate):
    """Create a new item"""
    global item_id_counter
    new_item = Item(id=item_id_counter, **item.model_dump())
    items_db.append(new_item)
    item_id_counter += 1
    return new_item

@router.put("/items/{item_id}", response_model=Item)
async def update_item(item_id: int, item: ItemCreate):
    """Update an existing item"""
    for i, existing_item in enumerate(items_db):
        if existing_item.id == item_id:
            updated_item = Item(id=item_id, **item.model_dump())
            items_db[i] = updated_item
            return updated_item
    raise HTTPException(status_code=404, detail="Item not found")

@router.delete("/items/{item_id}")
async def delete_item(item_id: int):
    """Delete an item"""
    for i, item in enumerate(items_db):
        if item.id == item_id:
            del items_db[i]
            return {"message": "Item deleted successfully"}
    raise HTTPException(status_code=404, detail="Item not found")

<<<<<<< HEAD
# Todo routes for Vue app compatibility
=======
>>>>>>> release/v0.0.5
@router.get("/todos", response_model=list[Todo])
async def get_todos():
    """Get all todos"""
    return todos_db

<<<<<<< HEAD
=======
@router.get("/todos/{todo_id}", response_model=Todo)
async def get_todo(todo_id: int):
    """Get a specific todo by ID"""
    for todo in todos_db:
        if todo.id == todo_id:
            return todo
    raise HTTPException(status_code=404, detail="Todo not found")

>>>>>>> release/v0.0.5
@router.post("/todos", response_model=Todo)
async def create_todo(todo: TodoCreate):
    """Create a new todo"""
    global todo_id_counter
<<<<<<< HEAD
    new_todo = Todo(id=todo_id_counter, **todo.model_dump())
=======
    now = datetime.now()
    new_todo = Todo(id=todo_id_counter, created_at=now, updated_at=now, **todo.model_dump())
>>>>>>> release/v0.0.5
    todos_db.append(new_todo)
    todo_id_counter += 1
    return new_todo

@router.put("/todos/{todo_id}", response_model=Todo)
async def update_todo(todo_id: int, todo: TodoCreate):
    """Update an existing todo"""
    for i, existing_todo in enumerate(todos_db):
        if existing_todo.id == todo_id:
<<<<<<< HEAD
            updated_todo = Todo(id=todo_id, **todo.model_dump())
=======
            now = datetime.now()
            updated_todo = Todo(id=todo_id, created_at=existing_todo.created_at, updated_at=now, **todo.model_dump())
>>>>>>> release/v0.0.5
            todos_db[i] = updated_todo
            return updated_todo
    raise HTTPException(status_code=404, detail="Todo not found")

@router.delete("/todos/{todo_id}")
async def delete_todo(todo_id: int):
    """Delete a todo"""
    for i, todo in enumerate(todos_db):
        if todo.id == todo_id:
            del todos_db[i]
            return {"message": "Todo deleted successfully"}
    raise HTTPException(status_code=404, detail="Todo not found")