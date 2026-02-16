from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class PredictionRequest(BaseModel):
    sequence: str

class PredictionResponse(BaseModel):
    prediction_score: float
    confidence: float

class RiskAnalysisRequest(BaseModel):
    clinical_data: str
    patient_history: Optional[str] = None

class RiskAnalysisResponse(BaseModel):
    risk_score: float
    risk_level: str
    analysis_text: str
    biomarker_valuation: str
    major_points: List[str]
    recommended_next_steps: List[str]
    methodology: str
    reference_databases: List[str]
    risk_factors: Dict[str, int]   # New: For Chart
    drug_options: List[str]        # New: Suggested Drugs

class ExplanationRequest(BaseModel):
    clinical_data: str
    risk_level: str
    biomarker_summary: str

class ExplanationResponse(BaseModel):
    explanation: str
