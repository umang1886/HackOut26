import math
import random
from datetime import datetime

from fastapi import Depends, FastAPI, HTTPException, Query, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security.api_key import APIKeyHeader

from model_service import model_service

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


# ─── AI Recommendation Engine ─────────────────────────────────────────────────
def generate_smart_recommendations(
    alert_type: str, severity: str, magnitude: float,
    hour: int, cloud_cover: float, wind_speed: float, temperature: float
) -> list[str]:
    """Context-aware recommendation generator — considers time, weather & magnitude."""
    recs: list[str] = []
    is_daytime = 6 <= hour < 19
    time_ctx = (
        "morning peak" if 8 <= hour < 12
        else "afternoon peak" if 12 <= hour < 17
        else "evening peak" if 17 <= hour < 21
        else "off-peak night"
    )

    if alert_type == "under-generation":
        bat_mw = round(magnitude * 0.45)
        peak_mw = round(magnitude * 0.55)
        if severity == "high":
            recs.append(f"URGENT: Dispatch {bat_mw} MW from battery storage immediately")
            recs.append(f"Activate {peak_mw} MW peaker gas units — est. cost ₹8.2/kWh")
        else:
            recs.append(f"Deploy {round(magnitude * 0.6)} MW from spinning reserve")
            recs.append("Import from Northern Regional Grid at interruptible tariff")

        if cloud_cover > 65:
            recs.append(
                f"Cloud cover {round(cloud_cover)}% suppressing solar — shortfall likely persists 2–3 h"
            )
        if not is_daytime:
            recs.append(
                f"Night {time_ctx}: solar unavailable — prioritise non-critical load shedding"
            )
        recs.append(
            f"Activate demand-response: notify top-15 industrial consumers "
            f"to curtail {round(magnitude * 0.2)} MW each"
        )

    elif alert_type == "over-generation":
        bat_absorb = round(magnitude * 0.55)
        recs.append(
            f"Charge battery banks: absorb {bat_absorb} MW for {time_ctx} demand offset"
        )
        if is_daytime:
            recs.append(
                "Shift flexible loads now: EV charging bays, cold-storage, irrigation pumps"
            )
        if temperature > 32:
            recs.append(
                f"High temp ({round(temperature)}°C) — pre-cool buildings during surplus "
                f"window to cut later peak"
            )
        recs.append(
            f"Notify grid operator: {round(magnitude * 0.3)} MW available for "
            f"interstate export at ₹4.5/kWh"
        )

    return recs


# ─── Realistic demand model ────────────────────────────────────────────────────
def estimate_demand(hour: int) -> float:
    """Sinusoidal demand model with morning + evening peak."""
    base = 180.0
    morning = 60 * math.sin(max(0.0, math.pi * (hour - 6) / 12)) if 6 <= hour <= 18 else 0.0
    evening = 80 * math.sin(max(0.0, math.pi * (hour - 17) / 5)) if 17 <= hour <= 22 else 0.0
    noise = random.uniform(-15, 15)
    return base + morning + evening + noise


# ─── Routes ───────────────────────────────────────────────────────────────────
@app.get("/forecast")
async def get_forecast(
    lat: float = Query(default=28.6139, description="Latitude"),
    lon: float = Query(default=77.2090, description="Longitude"),
    api_key: str = Depends(get_api_key),
):
    try:
        data, history, current_weather = await model_service.get_forecast_data(lat, lon)
        return {
            "data": data,
            "history": history,
            "current_weather": current_weather,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/alerts")
async def get_alerts(
    lat: float = Query(default=28.6139),
    lon: float = Query(default=77.2090),
    api_key: str = Depends(get_api_key),
):
    try:
        forecast_data, _, _ = await model_service.get_forecast_data(lat, lon)
        alerts: list[dict] = []

        for idx, f in enumerate(forecast_data):
            time_dt = datetime.fromisoformat(f["time"])
            hour = time_dt.hour
            demand = estimate_demand(hour)
            generation = f["forecast"]
            diff = generation - demand
            cloud = f.get("cloud_cover", 50.0)
            wind = f.get("wind_speed_10m", 10.0)
            temp = f.get("temperature_2m", 28.0)

            if diff < -50:
                severity = "high" if diff < -100 else "medium"
                alerts.append({
                    "id": f"alert_{idx}",
                    "type": "under-generation",
                    "severity": severity,
                    "time": f["time"],
                    "expected_shortfall": abs(diff),
                    "recommendations": generate_smart_recommendations(
                        "under-generation", severity, abs(diff), hour, cloud, wind, temp
                    ),
                })
            elif diff > 50:
                alerts.append({
                    "id": f"alert_{idx}",
                    "type": "over-generation",
                    "severity": "medium",
                    "time": f["time"],
                    "expected_surplus": diff,
                    "recommendations": generate_smart_recommendations(
                        "over-generation", "medium", diff, hour, cloud, wind, temp
                    ),
                })

        severity_map = {"high": 1, "medium": 2, "low": 3}
        alerts.sort(key=lambda x: (severity_map[x["severity"]], x["time"]))
        return {"data": alerts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/metrics")
async def get_metrics(api_key: str = Depends(get_api_key)):
    # Metrics endpoint kept for backward compatibility; dashboard now computes dynamically
    return {
        "data": {
            "estimated_cost_impact": -5000,
            "co2_impact": -120,
            "running_savings_cost": 45000,
            "running_savings_co2": 850,
        }
    }
