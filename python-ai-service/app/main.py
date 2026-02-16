from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.schemas import PredictionRequest, PredictionResponse, RiskAnalysisRequest, RiskAnalysisResponse
from app.model import predict_drug_target
from app.llm_service import analyze_cancer_risk

app = FastAPI(title="OncoPredict AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "OncoPredict AI Service is running"}

@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest):
    result = predict_drug_target(request.sequence)
    return result

@app.post("/analyze_risk", response_model=RiskAnalysisResponse)
def analyze_risk(request: RiskAnalysisRequest):
    result = analyze_cancer_risk(request.clinical_data)
    return result