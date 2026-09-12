import pickle
import pandas as pd
import numpy as np
import httpx
from datetime import datetime
import os

MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'solar_generation_xgboost_model.pkl')

class ModelService:
    def __init__(self):
        with open(MODEL_PATH, 'rb') as f:
            self.model = pickle.load(f)

    async def fetch_weather_forecast(self, latitude=28.6139, longitude=77.2090):
        # Using Open-Meteo API for forecast (next 72 hours approx)
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "hourly": ["temperature_2m", "relative_humidity_2m", "cloud_cover", "shortwave_radiation", "wind_speed_10m"],
            "forecast_days": 3,
            "timezone": "auto"
        }
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()

    def preprocess_features(self, weather_data):
        hourly = weather_data['hourly']
        df = pd.DataFrame({
            'time': pd.to_datetime(hourly['time']),
            'temperature_2m': hourly['temperature_2m'],
            'relative_humidity_2m': hourly['relative_humidity_2m'],
            'cloud_cover': hourly['cloud_cover'],
            'shortwave_radiation': hourly['shortwave_radiation'],
            'wind_speed_10m': hourly['wind_speed_10m']
        })

        df['hour'] = df['time'].dt.hour
        df['month'] = df['time'].dt.month
        df['day_of_year'] = df['time'].dt.dayofyear
        df['day_of_week'] = df['time'].dt.dayofweek

        # Cyclical encoding
        df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
        df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
        df['day_sin'] = np.sin(2 * np.pi * df['day_of_year'] / 365)
        df['day_cos'] = np.cos(2 * np.pi * df['day_of_year'] / 365)

        features = df[['temperature_2m', 'relative_humidity_2m', 'cloud_cover', 'shortwave_radiation', 'wind_speed_10m', 'hour', 'month', 'day_of_year', 'day_of_week', 'hour_sin', 'hour_cos', 'day_sin', 'day_cos']]
        return df['time'], features

    async def get_forecast(self):
        weather_data = await self.fetch_weather_forecast()
        times, features = self.preprocess_features(weather_data)
        
        predictions = self.model.predict(features)
        
        results = []
        for i, time in enumerate(times):
            pred = max(0, float(predictions[i])) # Ensure no negative generation
            # Mocking confidence interval logic (+/- 5% or 10%)
            margin = pred * 0.10
            lower = max(0, pred - margin)
            upper = pred + margin
            
            results.append({
                "time": time.isoformat(),
                "forecast": pred,
                "confidence_lower": lower,
                "confidence_upper": upper,
                "confidence_score": 85, # Mocked 85% confidence
                "temperature_2m": float(features['temperature_2m'].iloc[i]),
                "cloud_cover": float(features['cloud_cover'].iloc[i]),
                "wind_speed_10m": float(features['wind_speed_10m'].iloc[i])
            })
            
        return results

model_service = ModelService()
