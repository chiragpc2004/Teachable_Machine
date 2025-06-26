from pydantic import BaseModel

class UploadResponse(BaseModel):
    status: str
    label: str
    filename: str

class TrainResponse(BaseModel):
    accuracy: float
    classes: list[str]

class PredictResponse(BaseModel):
    prediction: str
    confidence: float

class ModelStatus(BaseModel):
    trained: bool
    model: str
    classes: list[str] | None = None
    accuracy: float | None = None
    samples: int | None = None
    message: str | None = None
