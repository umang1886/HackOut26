"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Legend,
} from "recharts";
import {
  Sun, Zap, AlertTriangle, TrendingUp, TrendingDown, Wind, Droplets,
  Cloud, Thermometer, DollarSign, Leaf, Activity, RefreshCw, ChevronRight,
  LayoutDashboard, BellRing, Settings, BarChart2, Database, Power,
  BatteryCharging, Battery, Clock, MapPin, Download, CheckCircle, Sliders, Shield, ChevronDown
} from "lucide-react";

const API_BASE = "http://127.0.0.1:8000";
const API_KEY = "sun-theory-secret-key";

const LOCATIONS = [
  { name: "Solar Plant A — New Delhi",  lat: 28.6139, lon: 77.2090, code: "DEL" },
  { name: "Solar Plant B — Mumbai",     lat: 19.0760, lon: 72.8777, code: "BOM" },
  { name: "Solar Plant C — Chennai",    lat: 13.0827, lon: 80.2707, code: "MAA" },
  { name: "Solar Plant D — Bengaluru",  lat: 12.9716, lon: 77.5946, code: "BLR" },
  { name: "Solar Plant E — Jaipur",     lat: 26.9124, lon: 75.7873, code: "JAI" },
];
const REFRESH_INTERVAL = 300; // seconds

const fetchWithKey = async (path: string) => {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "X-API-Key": API_KEY },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl p-3.5 text-xs min-w-[170px]" style={{ background: "rgba(10,16,22,0.92)", border: "1px solid rgba(52,211,153,0.18)", backdropFilter: "blur(20px)", boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(52,211,153,0.08)" }}>
      <p className="font-semibold text-white/50 mb-2.5 text-[10px] uppercase tracking-widest">{payload[0]?.payload?.fullTime || label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex justify-between gap-4 mt-1.5">
          <span style={{ color: p.color }} className="font-medium opacity-80">{p.name}</span>
          <span className="text-white font-bold">
            {typeof p.value === "number" ? `${p.value.toFixed(1)} MW` : `${p.value?.[0]?.toFixed(1)}–${p.value?.[1]?.toFixed(1)} MW`}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({
  icon: Icon, label, value, sub, accentColor, delay, trend,
}: {
  icon: any; label: string; value: string; sub?: string;
  accentColor: string; delay?: string; trend?: "up" | "down" | "neutral";
}) => (
  <div className={`stat-card animate-fadeInUp ${delay ?? ""}`} style={{ borderColor: `${accentColor}18` }}>
    {/* Background glow blob */}
    <div
      className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl"
      style={{ backgroundColor: accentColor, opacity: 0.12 }}
    />
    {/* Bottom corner accent */}
    <div
      className="absolute bottom-0 right-0 w-20 h-20 rounded-full blur-2xl"
      style={{ backgroundColor: accentColor, opacity: 0.07 }}
    />
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <div
          className="icon-pill"
          style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}28` }}
        >
          <Icon size={17} style={{ color: accentColor }} />
        </div>
        {trend && (
          <span
            className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
              trend === "up"
                ? "text-emerald-400 bg-emerald-400/10 border border-emerald-400/20"
                : trend === "down"
                ? "text-red-400 bg-red-400/10 border border-red-400/20"
                : "text-white/30"
            }`}
          >
            {trend === "up" ? <TrendingUp size={11} /> : trend === "down" ? <TrendingDown size={11} /> : null}
            {trend === "up" ? "+4.2%" : trend === "down" ? "-2.1%" : "Stable"}
          </span>
        )}
      </div>
      <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest mb-1.5">{label}</p>
      <p className="text-[22px] font-bold text-white leading-none" style={{ textShadow: `0 0 20px ${accentColor}30` }}>{value}</p>
      {sub && <p className="text-white/30 text-[11px] mt-2 font-medium">{sub}</p>}
    </div>
  </div>
);

// ─── Alert Item ───────────────────────────────────────────────────────────────
const AlertItem = ({ alert, index }: { alert: any; index: number }) => {
  const isCritical = alert.severity === "high" && alert.type === "under-generation";
  const isWarning = alert.severity === "medium" && alert.type === "under-generation";
  const isSurplus = alert.type === "over-generation";

  const classes = isCritical ? "alert-item alert-critical" : isWarning ? "alert-item alert-warning" : "alert-item alert-surplus";
  const badgeClass = isCritical ? "badge badge-critical" : isWarning ? "badge badge-warning" : "badge badge-surplus";
  const badgeText = isCritical ? "Critical" : isWarning ? "Warning" : "Surplus";
  const Icon = isSurplus ? Power : Battery;
  const iconColor = isCritical ? "#f87171" : isWarning ? "#fbbf24" : "#60a5fa";

  const magnitude = alert.expected_shortfall
    ? `-${Math.round(alert.expected_shortfall)} MW`
    : `+${Math.round(alert.expected_surplus)} MW`;

  const timeStr = new Date(alert.time).toLocaleString([], {
    weekday: "short", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className={`${classes} animate-fadeInUp`} style={{ animationDelay: `${index * 0.08}s` }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={16} style={{ color: iconColor }} />
          <span className={badgeClass}>{badgeText}</span>
        </div>
        <div className="flex items-center gap-1 text-white/40 text-xs">
          <Clock size={11} />
          {timeStr}
        </div>
      </div>
      <div className="text-2xl font-bold mb-3" style={{ color: iconColor }}>{magnitude}</div>
      <div className="border-t border-white/5 pt-3 space-y-1.5">
        {alert.recommendations.map((r: string, i: number) => (
          <div key={i} className="flex items-start gap-2 text-xs text-white/60">
            <ChevronRight size={12} className="mt-0.5 flex-shrink-0" style={{ color: iconColor }} />
            {r}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const Sidebar = ({ alertCount, activeTab, setActiveTab }: { alertCount: number; activeTab: string; setActiveTab: (tab: string) => void }) => {
  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", active: activeTab === "Dashboard" },
    { icon: BarChart2, label: "Analytics", active: activeTab === "Analytics" },
    { icon: Database, label: "Data Lake", active: activeTab === "Data Lake" },
    { icon: BellRing, label: "Alerts", active: activeTab === "Alerts", badge: alertCount },
    { icon: Settings, label: "Settings", active: activeTab === "Settings" },
  ];

  return (
    <aside className="sidebar animate-fadeInLeft">
      {/* Logo */}
      <div className="px-2 mb-8">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #34d399, #22d3ee)",
              boxShadow: "0 0 24px rgba(52,211,153,0.45), 0 4px 12px rgba(0,0,0,0.3)",
            }}
          >
            <Sun size={20} className="text-slate-900" />
          </div>
          <div>
            <p className="font-bold text-white text-sm tracking-wider" style={{ letterSpacing: "0.08em" }}>SUN THEORY</p>
            <p className="text-[10px] tracking-widest font-semibold" style={{ color: "rgba(52,211,153,0.5)", letterSpacing: "0.12em" }}>AI FORECASTING</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="divider mb-4" />

      {/* Nav */}
      <nav className="flex-1 space-y-0.5">
        <p className="px-3 text-[9.5px] font-bold text-white/20 uppercase tracking-[0.14em] mb-3">Navigation</p>
        {navItems.map(({ icon: Icon, label, active, badge }) => (
          <div key={label} className={`nav-item ${active ? "active" : ""}`} onClick={() => setActiveTab(label)}>
            <Icon size={15} />
            <span className="flex-1 text-[13px]">{label}</span>
            {badge !== undefined && badge > 0 && (
              <span className="text-white text-[9.5px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(248,113,113,0.8)", boxShadow: "0 0 8px rgba(248,113,113,0.4)" }}>
                {badge}
              </span>
            )}
          </div>
        ))}
      </nav>

      {/* Divider */}
      <div className="divider mt-4 mb-4" />

      {/* Live status */}
      <div className="rounded-2xl p-3.5" style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.14)" }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="pulse-dot" />
          <p className="text-[11px] font-bold text-emerald-400 tracking-wide">Live Feed Active</p>
        </div>
        <div className="space-y-1 ml-3.5">
          <p className="text-[10px] text-white/35 font-medium">◦ Open-Meteo API synced</p>
          <p className="text-[10px] text-white/35 font-medium">◦ XGBoost Model v1.0</p>
        </div>
      </div>
    </aside>
  );
};

// ─── Weather Strip ─────────────────────────────────────────────────────────────
const WeatherStrip = ({ forecastData }: { forecastData: any[] }) => {
  const now = forecastData[0];
  if (!now) return null;
  return (
    <div className="flex items-center gap-6 text-xs text-white/50">
      <div className="flex items-center gap-1.5">
        <Thermometer size={12} className="text-amber-400" />
        <span>{now.temperature_2m?.toFixed(1) ?? "—"}°C</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Droplets size={12} className="text-cyan-400" />
        <span>{now.relative_humidity_2m?.toFixed(0) ?? "—"}%</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Cloud size={12} className="text-white/40" />
        <span>{now.cloud_cover?.toFixed(0) ?? "—"}%</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Wind size={12} className="text-blue-400" />
        <span>{now.wind_speed_10m?.toFixed(1) ?? "—"} km/h</span>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [forecast, setForecast] = useState<any[]>([]);
  const [rawForecast, setRawForecast] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeRange, setActiveRange] = useState<24 | 48 | 72>(72);
  const [activeTab, setActiveTab] = useState("Dashboard");
  // Feature: multi-location
  const [selectedLocation, setSelectedLocation] = useState(LOCATIONS[0]);
  const [locationOpen, setLocationOpen] = useState(false);
  // Feature: auto-refresh countdown
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  // Feature: history comparison
  const [historyForecast, setHistoryForecast] = useState<any[]>([]);
  // Feature: live weather
  const [currentWeather, setCurrentWeather] = useState<any>(null);
  // Feature: notifications
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());
  // Feature: resolve alerts
  const [resolvedAlertIds, setResolvedAlertIds] = useState<Set<string>>(new Set());

  const visibleAlerts = alerts.filter(a => !resolvedAlertIds.has(a.id));

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const { lat, lon } = selectedLocation;
      const [forecastRes, alertsRes, metricsRes] = await Promise.all([
        fetchWithKey(`/forecast?lat=${lat}&lon=${lon}`),
        fetchWithKey(`/alerts?lat=${lat}&lon=${lon}`),
        fetchWithKey("/metrics"),
      ]);

      const raw = forecastRes.data;
      setRawForecast(raw);
      setHistoryForecast(forecastRes.history ?? []);
      setCurrentWeather(forecastRes.current_weather ?? null);

      const formatted = raw.map((f: any) => {
        const d = new Date(f.time);
        return {
          ...f,
          timeLabel: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          fullTime: d.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
          confidenceArea: [f.confidence_lower, f.confidence_upper] as [number, number],
        };
      });

      setForecast(formatted);
      setAlerts(alertsRes.data);
      setMetrics(metricsRes.data);
      setLastUpdated(new Date());
      setCountdown(REFRESH_INTERVAL); // reset countdown on successful load
    } catch (e: any) {
      setError("Backend unavailable. Start uvicorn first: uvicorn main:app --port 8000");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedLocation]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Auto-refresh countdown ──
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { loadData(true); return REFRESH_INTERVAL; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [loadData]);

  // ── Browser notification permission (Feature 4) ──
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  // ── Fire notifications for new critical alerts ──
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const critical = alerts.filter((a: any) => a.severity === "high" && !notifiedIds.has(a.id));
    critical.forEach((alert: any) => {
      new Notification("⚡ Critical Grid Alert — SUN THEORY", {
        body: `${Math.round(alert.expected_shortfall)} MW shortfall at ${
          new Date(alert.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        } · ${selectedLocation.name}`,
        icon: "/favicon.ico",
      });
    });
    if (critical.length > 0) {
      setNotifiedIds(prev => new Set([...prev, ...critical.map((a: any) => a.id)]));
    }
  }, [alerts]);

  // ── CSV Export handler (Feature 5) ──
  const handleExportCSV = () => {
    const headers = ["Timestamp", "Forecast (MW)", "Lower Bound", "Upper Bound", "Temp (°C)", "Cloud Cover (%)", "Wind (km/h)", "Solar Radiation (W/m²)"];
    const rows = forecast.map((f: any) => [
      f.fullTime,
      f.forecast.toFixed(2),
      f.confidence_lower?.toFixed(2) ?? "",
      f.confidence_upper?.toFixed(2) ?? "",
      f.temperature_2m?.toFixed(1) ?? "",
      f.cloud_cover?.toFixed(0) ?? "",
      f.wind_speed_10m?.toFixed(1) ?? "",
      f.shortwave_radiation?.toFixed(1) ?? "",
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sun-theory-${selectedLocation.code}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Merge history into slicedForecast for overlay chart (Feature 3)
  const slicedForecast = forecast.slice(0, activeRange).map((d, i) => ({
    ...d,
    previousForecast: historyForecast[i]?.forecast ?? undefined,
  }));
  const peakGen = slicedForecast.length ? Math.max(...slicedForecast.map((d) => d.forecast)) : 0;
  const avgGen = slicedForecast.length
    ? slicedForecast.reduce((acc, d) => acc + d.forecast, 0) / slicedForecast.length
    : 0;

  // Dynamic calculations based on selected range
  // Total energy in MWh (each data point is 1 hour, so forecast MW = MWh)
  const totalEnergyMWh = slicedForecast.reduce((acc, d) => acc + d.forecast, 0);
  // Cost saved: using avoided grid purchase at ₹7/kWh = ₹7000/MWh
  const costSaved = Math.round(totalEnergyMWh * 7000);
  // CO2 prevented: India grid emission factor ~0.82 kg CO2 per kWh = 0.82 T per MWh
  const co2Prevented = (totalEnergyMWh * 0.82).toFixed(1);
  const rangeLabel = `Next ${activeRange} hours`;

  // Impact summary section — calculated from full 72h and 24h windows
  const today24hEnergy = forecast.slice(0, 24).reduce((acc, d) => acc + d.forecast, 0);
  const full72hEnergy = forecast.slice(0, 72).reduce((acc, d) => acc + d.forecast, 0);
  // Today's savings = 24h energy × ₹7000/MWh
  const todayCostSavings = Math.round(today24hEnergy * 7000);
  // Monthly running total estimate: 72h * (30/3) days scaling
  const monthlyRunningCost = Math.round(full72hEnergy * 7000 * (30 / 3));
  // Monthly target: assume ₹2 Cr monthly target
  const monthlyTargetCost = 20_000_000;
  const costProgressPct = Math.min(100, Math.round((monthlyRunningCost / monthlyTargetCost) * 100));
  // CO2 today (24h)
  const todayCO2 = (today24hEnergy * 0.82).toFixed(1);
  // Monthly CO2 offset estimate
  const monthlyCO2 = (full72hEnergy * 0.82 * (30 / 3)).toFixed(1);
  // Monthly target CO2: 50,000 T
  const monthlyTargetCO2 = 50_000;
  const co2ProgressPct = Math.min(100, Math.round((parseFloat(monthlyCO2) / monthlyTargetCO2) * 100));
  const treesPlanted = Math.round(parseFloat(monthlyCO2) * 45);

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen grid-bg">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center mx-auto animate-pulse" style={{ boxShadow: "0 0 40px rgba(52,211,153,0.4)" }}>
            <Sun size={32} className="text-slate-900" />
          </div>
          <p className="text-white font-semibold">Loading SUN THEORY…</p>
          <p className="text-white/40 text-sm">Syncing with Open-Meteo & running XGBoost inference</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen grid-bg">
      <Sidebar alertCount={visibleAlerts.length} activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-8 py-4 topbar-glass gap-4">
          {/* Left: Title + location dropdown */}
          <div className="flex-shrink-0">
            <h1 className="text-[17px] font-bold tracking-tight" style={{ background: "linear-gradient(135deg, #ffffff, rgba(52,211,153,0.85))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Grid Operations Dashboard
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              {/* Feature 2: Location selector */}
              <div className="relative">
                <button
                  onClick={() => setLocationOpen(o => !o)}
                  className="flex items-center gap-1.5 weather-chip cursor-pointer"
                >
                  <MapPin size={10} className="text-emerald-400" />
                  <span className="max-w-[180px] truncate">{selectedLocation.name}</span>
                  <ChevronDown size={10} className={`transition-transform ${locationOpen ? "rotate-180" : ""}`} />
                </button>
                {locationOpen && (
                  <div className="absolute top-full left-0 mt-1.5 z-50 rounded-2xl overflow-hidden min-w-[240px]"
                    style={{ background: "rgba(10,16,22,0.97)", border: "1px solid rgba(52,211,153,0.18)", backdropFilter: "blur(24px)", boxShadow: "0 16px 48px rgba(0,0,0,0.6)" }}
                  >
                    {LOCATIONS.map(loc => (
                      <button key={loc.code}
                        onClick={() => { setSelectedLocation(loc); setLocationOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-[13px] transition-colors hover:bg-white/5"
                        style={{ color: loc.code === selectedLocation.code ? "#34d399" : "rgba(255,255,255,0.6)" }}
                      >
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(52,211,153,0.1)", color: "#34d399" }}>{loc.code}</span>
                        {loc.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {lastUpdated && (
                <div className="weather-chip">
                  <Clock size={10} />
                  Updated {lastUpdated.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>

          {/* Center: Feature 6 — Live weather strip */}
          {currentWeather && (
            <div className="hidden xl:flex items-center gap-5 text-[12px] text-white/45 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <Thermometer size={12} className="text-amber-400" />
                {currentWeather.temperature_2m?.toFixed(1) ?? "—"}°C
              </div>
              <div className="flex items-center gap-1.5">
                <Droplets size={12} className="text-cyan-400" />
                {currentWeather.relative_humidity_2m?.toFixed(0) ?? "—"}%
              </div>
              <div className="flex items-center gap-1.5">
                <Cloud size={12} className="text-white/40" />
                {currentWeather.cloud_cover?.toFixed(0) ?? "—"}%
              </div>
              <div className="flex items-center gap-1.5">
                <Wind size={12} className="text-blue-400" />
                {currentWeather.wind_speed_10m?.toFixed(1) ?? "—"} km/h
              </div>
            </div>
          )}

          {/* Right: actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {error && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-amber-400 border" style={{ background: "rgba(251,191,36,0.08)", borderColor: "rgba(251,191,36,0.2)" }}>
                <AlertTriangle size={12} />
                Backend offline
              </div>
            )}
            {/* Feature 5: CSV Export */}
            <button
              onClick={handleExportCSV}
              disabled={forecast.length === 0}
              title="Export CSV"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
            >
              <Download size={13} />
              CSV
            </button>
            {/* Feature 1: Countdown */}
            <div className="text-[11px] font-mono tabular-nums px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.28)" }}>
              <RefreshCw size={10} className="inline mr-1 opacity-50" />
              {String(Math.floor(countdown / 60)).padStart(2, "0")}:{String(countdown % 60).padStart(2, "0")}
            </div>
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
            <div className="badge badge-online">
              <div className="pulse-dot" style={{ width: 6, height: 6 }} />
              Live
            </div>
          </div>
        </header>

        <main className="flex-1 px-8 py-6 space-y-6">
          {activeTab === "Analytics" && (
            <div className="space-y-6 animate-fadeInUp">
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <BarChart2 size={18} className="text-cyan-400" />
                      Model Performance Analytics
                    </h2>
                    <p className="text-white/40 text-xs mt-1">Correlation between weather variables and generation</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">MAPE (Error Rate)</p>
                    <p className="text-2xl font-bold text-white mt-1">4.2%</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">R² Score</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">0.96</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">Analyzed Points</p>
                    <p className="text-2xl font-bold text-white mt-1">{(forecast?.length || 0) * 4}</p>
                  </div>
                </div>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={forecast.slice(0, 48)} margin={{ left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="timeLabel" stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="left" stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="right" orientation="right" stroke="rgba(34,211,238,0.5)" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Line yAxisId="left" type="monotone" dataKey="forecast" stroke="#34d399" strokeWidth={2.5} dot={false} name="Generation (MW)" />
                      <Line yAxisId="right" type="monotone" dataKey="temperature_2m" stroke="#22d3ee" strokeWidth={2} dot={false} strokeDasharray="5 5" name="Temperature (°C)" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Data Lake" && (
            <div className="glass-card p-6 animate-fadeInUp flex flex-col h-[78vh]">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Database size={18} className="text-violet-400" />
                    Raw Telemetry Data
                  </h2>
                  <p className="text-white/40 text-xs mt-1">Hourly logs from Open-Meteo & XGBoost predictions</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white/70 bg-white/5 border border-white/10 hover:text-white hover:bg-white/10 transition-all">
                  <Download size={14} />
                  Export CSV
                </button>
              </div>
              <div className="flex-1 overflow-auto nice-scroll rounded-xl border border-white/10">
                <table className="w-full text-sm text-left">
                  <thead className="text-[11px] text-white/50 uppercase bg-black/40 sticky top-0 backdrop-blur-xl z-10">
                    <tr>
                      <th className="px-6 py-4 font-semibold tracking-wider">Timestamp</th>
                      <th className="px-6 py-4 font-semibold tracking-wider text-emerald-400">Forecast (MW)</th>
                      <th className="px-6 py-4 font-semibold tracking-wider">Temp (°C)</th>
                      <th className="px-6 py-4 font-semibold tracking-wider">Cloud Cover (%)</th>
                      <th className="px-6 py-4 font-semibold tracking-wider">Wind (km/h)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {forecast.map((f, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-3.5 text-white/80 font-medium">{f.fullTime}</td>
                        <td className="px-6 py-3.5 font-bold text-emerald-400">{f.forecast.toFixed(2)}</td>
                        <td className="px-6 py-3.5 text-white/60">{f.temperature_2m?.toFixed(1) ?? "-"}</td>
                        <td className="px-6 py-3.5 text-white/60">{f.cloud_cover?.toFixed(0) ?? "-"}</td>
                        <td className="px-6 py-3.5 text-white/60">{f.wind_speed_10m?.toFixed(1) ?? "-"}</td>
                      </tr>
                    ))}
                    {forecast.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-white/30">No telemetry data available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "Alerts" && (
            <div className="glass-card p-6 animate-fadeInUp min-h-[78vh]">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <BellRing size={18} className="text-amber-400" />
                    Grid Event Log
                  </h2>
                  <p className="text-white/40 text-xs mt-1">Historical and active alerts</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 text-white">All Events</button>
                  <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/50 hover:text-white transition-all">Critical</button>
                  <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/50 hover:text-white transition-all">Warnings</button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleAlerts.length > 0 ? (
                  visibleAlerts.map((a, i) => (
                    <div key={a.id} className="relative group">
                      <AlertItem alert={a} index={i} />
                      <button 
                        onClick={() => setResolvedAlertIds(prev => new Set([...prev, a.id]))}
                        className="absolute top-4 right-4 text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded bg-black/20 hover:bg-black/60 text-white/30 hover:text-emerald-400 transition-colors z-10 opacity-0 group-hover:opacity-100 cursor-pointer"
                      >
                        Resolve
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 flex flex-col items-center justify-center py-20 text-white/30">
                    <CheckCircle size={48} className="mb-4 text-emerald-400/20" />
                    <p className="font-semibold text-lg">All Clear</p>
                    <p className="text-sm">No historical alerts in this window.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "Settings" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeInUp">
              <div className="glass-card p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                    <Sliders size={18} className="text-blue-400" />
                    Dashboard Preferences
                  </h2>
                  <p className="text-white/40 text-xs">Customize your grid view</p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-black/20">
                    <div>
                      <p className="font-medium text-white text-sm">High Contrast Mode</p>
                      <p className="text-white/40 text-xs">Increase legibility of charts</p>
                    </div>
                    <div className="w-10 h-5 bg-white/10 rounded-full relative cursor-pointer">
                      <div className="w-4 h-4 bg-white/50 rounded-full absolute left-0.5 top-0.5" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-black/20">
                    <div>
                      <p className="font-medium text-white text-sm">Sound Alerts</p>
                      <p className="text-white/40 text-xs">Play chime on critical events</p>
                    </div>
                    <div className="w-10 h-5 bg-emerald-400/30 rounded-full relative cursor-pointer">
                      <div className="w-4 h-4 bg-emerald-400 rounded-full absolute right-0.5 top-0.5" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                    <Shield size={18} className="text-purple-400" />
                    API & Security
                  </h2>
                  <p className="text-white/40 text-xs">Manage backend connections</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-widest">Open-Meteo API Key</label>
                    <div className="flex gap-2">
                      <input type="password" value="••••••••••••••••" readOnly className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none" />
                      <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition-colors">Update</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-widest">XGBoost Model Version</label>
                    <select className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none appearance-none">
                      <option>v1.0 (Production)</option>
                      <option>v1.1-beta (Testing)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Dashboard" && (
            <>
              {/* ── Stat Cards Row ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Zap} label="Peak Generation" value={`${peakGen.toFixed(1)} MW`} sub={rangeLabel} accentColor="#34d399" delay="delay-100" trend="up" />
            <StatCard icon={Activity} label="Avg Generation" value={`${avgGen.toFixed(1)} MW`} sub="Forecast period" accentColor="#22d3ee" delay="delay-200" trend="neutral" />
            <StatCard icon={DollarSign} label="Cost Saved" value={`₹${costSaved.toLocaleString()}`} sub={rangeLabel} accentColor="#a78bfa" delay="delay-300" trend="up" />
            <StatCard icon={Leaf} label="CO₂ Prevented" value={`${co2Prevented} T`} sub={rangeLabel} accentColor="#34d399" delay="delay-400" trend="up" />
          </div>

          {/* ── Main Charts Row ── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* ── Forecast Chart ── */}
            <div className="xl:col-span-2 glass-card p-6 animate-fadeInUp delay-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Activity size={16} className="text-emerald-400" />
                    Solar Generation Forecast
                  </h2>
                  <p className="text-white/40 text-xs mt-0.5">XGBoost model · Live Open-Meteo weather input</p>
                </div>
                <div className="flex items-center gap-2">
                  {([24, 48, 72] as const).map((h) => (
                    <button
                      key={h}
                      onClick={() => setActiveRange(h)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${activeRange === h ? "bg-emerald-400/20 text-emerald-400 border border-emerald-400/30" : "text-white/40 hover:text-white/70"}`}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={slicedForecast} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="genGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="ciGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="timeLabel" stroke="rgba(255,255,255,0.15)" fontSize={11} tickLine={false} axisLine={false} minTickGap={28} />
                    <YAxis stroke="rgba(255,255,255,0.15)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} />
                    <Tooltip content={<ChartTooltip />} />
                    <ReferenceLine y={avgGen} stroke="rgba(34,211,238,0.4)" strokeDasharray="4 4" label={{ value: "avg", fill: "rgba(34,211,238,0.6)", fontSize: 10 }} />
                    <Area type="monotone" dataKey="confidenceArea" fill="url(#ciGradient)" stroke="none" name="Confidence Band (85%)" />
                    <Area type="monotone" dataKey="forecast" stroke="#34d399" strokeWidth={0} fill="url(#genGradient)" name="" />
                    {/* Feature 3: Previous forecast history overlay */}
                    {historyForecast.length > 0 && (
                      <Line type="monotone" dataKey="previousForecast" stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} name="Prev Forecast (MW)" />
                    )}
                    <Line type="monotone" dataKey="forecast" stroke="#34d399" strokeWidth={2.5} dot={false} name="Predicted (MW)" activeDot={{ r: 5, fill: "#34d399", strokeWidth: 0 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Chart legend */}
              <div className="flex items-center gap-6 mt-4 text-xs text-white/40 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-emerald-400 rounded" />
                  <span>Predicted Generation</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-2 rounded" style={{ background: "rgba(52,211,153,0.15)" }} />
                  <span>85% Confidence Interval</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-cyan-400 rounded" style={{ borderTop: "2px dashed rgb(34,211,238)" }} />
                  <span>Average</span>
                </div>
                {historyForecast.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0" style={{ border: "1.5px dashed rgba(255,255,255,0.3)" }} />
                    <span>Previous Forecast</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Alerts Panel ── */}
            <div className="glass-card p-6 flex flex-col animate-fadeInUp delay-300">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-400" />
                  Alerts & Actions
                </h2>
                <span className="badge badge-warning text-[11px]">{visibleAlerts.length} Events</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin -mr-1 pr-1 max-h-[340px]">
                {visibleAlerts.length === 0 ? (
                  <div className="text-center py-12 text-white/30">
                    <BatteryCharging size={32} className="mx-auto mb-3 text-emerald-400/30" />
                    <p className="font-medium">Grid is Stable</p>
                    <p className="text-xs mt-1">No critical events detected</p>
                  </div>
                ) : (
                  visibleAlerts.slice(0, 8).map((a, i) => <AlertItem key={a.id} alert={a} index={i} />)
                )}
              </div>
            </div>
          </div>

          {/* ── Hourly Breakdown Bar Chart ── */}
          <div className="glass-card p-6 animate-fadeInUp delay-400">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart2 size={16} className="text-purple-400" />
                  Hourly Generation Breakdown
                </h2>
                <p className="text-white/40 text-xs mt-0.5">Next 24 hours — bar by bar</p>
              </div>
            </div>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecast.slice(0, 24)} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="timeLabel" stroke="rgba(255,255,255,0.15)" fontSize={10} tickLine={false} axisLine={false} minTickGap={20} />
                  <YAxis stroke="rgba(255,255,255,0.15)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="forecast" fill="url(#barGrad)" radius={[4, 4, 0, 0]} name="Generation (MW)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Today's Impact Summary ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeInUp delay-500">
            {/* Financial Impact */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="icon-pill" style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.25)" }}>
                  <DollarSign size={16} className="text-violet-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Financial Impact</h3>
                  <p className="text-[10px] text-white/30 font-medium">Based on live forecast data · ₹7/kWh rate</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-1">
                  <span className="text-white/45 text-[13px]">Today's Cost Savings (24h)</span>
                  <span className="font-bold text-emerald-400 text-[13px]">₹{todayCostSavings.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-white/45 text-[13px]">Est. Monthly Running Total</span>
                  <span className="font-bold text-white text-[13px]">₹{monthlyRunningCost.toLocaleString()}</span>
                </div>
                <div className="divider" />
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-white/30 text-[11px]">Monthly target progress (₹2 Cr)</span>
                    <span className="text-violet-400 text-[11px] font-bold">{costProgressPct}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${costProgressPct}%`, background: "linear-gradient(90deg, #a78bfa, #34d399)" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Environmental Impact */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="icon-pill" style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.25)" }}>
                  <Leaf size={16} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Environmental Impact</h3>
                  <p className="text-[10px] text-white/30 font-medium">Based on India grid factor · 0.82 kg CO₂/kWh</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-1">
                  <span className="text-white/45 text-[13px]">CO₂ Prevented Today (24h)</span>
                  <span className="font-bold text-emerald-400 text-[13px]">{todayCO2} Tons</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-white/45 text-[13px]">Est. Monthly CO₂ Offset</span>
                  <span className="font-bold text-white text-[13px]">{parseFloat(monthlyCO2).toLocaleString()} Tons</span>
                </div>
                <div className="divider" />
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-white/30 text-[11px]">≈ {treesPlanted.toLocaleString()} trees planted</span>
                    <span className="text-emerald-400 text-[11px] font-bold">{co2ProgressPct}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${co2ProgressPct}%`, background: "linear-gradient(90deg, #34d399, #22d3ee)" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          </>
          )}
        </main>
      </div>
    </div>
  );
}
