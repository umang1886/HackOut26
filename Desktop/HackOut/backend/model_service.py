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
        # In-memory store: last forecast per location for history comparison
        self._last_forecast: dict[str, list] = {}

    async def fetch_weather_forecast(self, latitude: float, longitude: float):
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "hourly": [
                "temperature_2m", "relative_humidity_2m", "cloud_cover",
                "shortwave_radiation", "wind_speed_10m"
            ],
            "current": [
                "temperature_2m", "relative_humidity_2m",
                "cloud_cover", "wind_speed_10m"
            ],
            "forecast_days": 3,
            "timezone": "auto"
        }
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()

    def preprocess_features(self, weather_data: dict):
        hourly = weather_data['hourly']
        df = pd.DataFrame({
            'time': pd.to_datetime(hourly['time']),
            'temperature_2m': hourly['temperature_2m'],
            'relative_humidity_2m': hourly['relative_humidity_2m'],
            'cloud_cover': hourly['cloud_cover'],
            'shortwave_radiation': hourly['shortwave_radiation'],
            'wind_speed_10m': hourly['wind_speed_10m'],
        })

        df['hour'] = df['time'].dt.hour
        df['month'] = df['time'].dt.month
        df['day_of_year'] = df['time'].dt.dayofyear
        df['day_of_week'] = df['time'].dt.dayofweek

        df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
        df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
        df['day_sin'] = np.sin(2 * np.pi * df['day_of_year'] / 365)
        df['day_cos'] = np.cos(2 * np.pi * df['day_of_year'] / 365)

        feature_cols = [
            'temperature_2m', 'relative_humidity_2m', 'cloud_cover',
            'shortwave_radiation', 'wind_speed_10m', 'hour', 'month',
            'day_of_year', 'day_of_week', 'hour_sin', 'hour_cos',
            'day_sin', 'day_cos'
        ]
        return df, df[feature_cols]

    async def get_forecast_data(self, latitude: float = 28.6139, longitude: float = 77.2090):
        """
        Returns (current_results, history_results, current_weather).
        Stores current results as history for the next call per location.
        """
        weather_data = await self.fetch_weather_forecast(latitude, longitude)
        df, features = self.preprocess_features(weather_data)
        predictions = self.model.predict(features)

        location_key = f"{round(latitude, 3)}_{round(longitude, 3)}"
        history = list(self._last_forecast.get(location_key, []))

        results = []
        for i in range(len(df)):
            row = df.iloc[i]
            pred = max(0.0, float(predictions[i]))
            margin = pred * 0.10
            results.append({
                "time": row['time'].isoformat(),
                "forecast": pred,
                "confidence_lower": max(0.0, pred - margin),
                "confidence_upper": pred + margin,
                "confidence_score": 85,
                "temperature_2m": float(row['temperature_2m']),
                "cloud_cover": float(row['cloud_cover']),
                "wind_speed_10m": float(row['wind_speed_10m']),
                "shortwave_radiation": float(row['shortwave_radiation']),
                "relative_humidity_2m": float(row['relative_humidity_2m']),
            })

        self._last_forecast[location_key] = results

        current_weather = weather_data.get('current', {})
        return results, history, current_weather


model_service = ModelService()
