from fastapi import FastAPI, Depends, HTTPException, Security
from fastapi.security.api_key import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from model_service import model_service
import random
from datetime import datetime, timedelta

app = FastAPI(title="SUN THEORY API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = "sun-theory-secret-key"
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

async def get_api_key(api_key_header: str = Security(api_key_header)):
    if api_key_header == API_KEY:
        return api_key_header
    raise HTTPException(status_code=403, detail="Could not validate credentials")

@app.get("/forecast")
async def get_forecast(api_key: str = Depends(get_api_key)):
    try:
        forecast = await model_service.get_forecast()
        return {"data": forecast}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/alerts")
async def get_alerts(api_key: str = Depends(get_api_key)):
    try:
        forecast_data = await model_service.get_forecast()
        alerts = []
        
        # Mock expected demand (e.g., 200 MW base + sinusoidal variation)
        for idx, f in enumerate(forecast_data):
            time_dt = datetime.fromisoformat(f["time"])
            demand = 200 + 50 * random.random() # Simplified mock demand
            generation = f["forecast"]
            
            diff = generation - demand
            
            if diff < -50:
                alerts.append({
                    "id": f"alert_{idx}",
                    "type": "under-generation",
                    "severity": "high" if diff < -100 else "medium",
                    "time": f["time"],
                    "expected_shortfall": abs(diff),
                    "recommendations": [
                        "Discharge available battery storage",
                        "Activate backup generation"
                    ]
                })
            elif diff > 50:
                alerts.append({
                    "id": f"alert_{idx}",
                    "type": "over-generation",
                    "severity": "medium",
                    "time": f["time"],
                    "expected_surplus": diff,
                    "recommendations": [
                        "Charge the battery",
                        "Shift flexible electricity usage to this period",
                        "Curtail excess renewable generation if necessary"
                    ]
                })
                
        # Sort by proximity in time and severity (High -> Medium)
        severity_map = {"high": 1, "medium": 2, "low": 3}
        alerts.sort(key=lambda x: (severity_map[x["severity"]], x["time"]))
        
        return {"data": alerts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/metrics")
async def get_metrics(api_key: str = Depends(get_api_key)):
    # Mocked metrics for dashboard
    return {
        "data": {
            "estimated_cost_impact": -5000, # e.g. saved 5000
            "co2_impact": -120, # e.g. saved 120 tons
            "running_savings_cost": 45000,
            "running_savings_co2": 850
        }
    }
