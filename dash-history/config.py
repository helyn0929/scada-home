# config.py
import os
from dotenv import load_dotenv

# 從 backend/.env 載入（與 Flask 共用同一份）
_backend_env = os.path.join(os.path.dirname(__file__), "..", "backend", ".env")
load_dotenv(_backend_env)

# ========== InfluxDB ==========
influx_url               = os.getenv("INFLUX_URL", "http://localhost:8086")
influx_token             = os.getenv("INFLUX_TOKEN", "")
influx_org               = os.getenv("INFLUX_ORG", "SCADA_hushan")
influx_bucket            = os.getenv("INFLUX_BUCKET", "real_time_data")
influx_bucket_aggregated = os.getenv("INFLUX_BUCKET_AGGREGATED", "aggregated_data")

INFLUX_MEASUREMENT_REALTIME   = "measurements"
INFLUX_MEASUREMENT_AGGREGATED = "hourly_stats"

# ========== 其他 ==========
GENERATION_THRESHOLD = 0.0
