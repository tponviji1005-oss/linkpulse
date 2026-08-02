import { JSDOM } from "jsdom";
import { StrictMode, useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import toast, { Toaster } from "react-hot-toast";
import { MemoryRouter, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
//#region src/api/client.js
var BASE_URL = "http://localhost:5000";
var ApiError = class extends Error {
	constructor(message, status = 0) {
		super(message);
		this.name = "ApiError";
		this.status = status;
	}
};
function messageForStatus(status) {
	switch (status) {
		case 401: return "Your session has expired. Please log in again.";
		case 403: return "You do not have permission to perform this action.";
		case 404: return "The requested resource was not found.";
		case 429: return "Too many requests. Please try again later.";
		case 500: return "Something went wrong on the server. Please try again.";
		case 502:
		case 503:
		case 504: return "The server is temporarily unavailable. Please try again.";
		default: return "Request failed";
	}
}
function buildHeaders(custom = {}, skipContentType = false) {
	const token = localStorage.getItem("token");
	const headers = { ...custom };
	if (!skipContentType && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
	if (token) headers["Authorization"] = `Bearer ${token}`;
	return headers;
}
async function textOrNull(res) {
	const text = await res.text();
	if (!text) return null;
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}
async function parseResponse(res) {
	const data = await textOrNull(res);
	if (!res.ok) throw new ApiError(data && (data.error || data.message) || messageForStatus(res.status), res.status);
	return data;
}
async function request(path, options = {}) {
	const { headers, body, ...rest } = options;
	const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
	let res;
	try {
		res = await fetch(`${BASE_URL}${path}`, {
			...rest,
			headers: buildHeaders(headers, isFormData),
			body
		});
	} catch {
		throw new ApiError("Network error. Please check your connection and try again.");
	}
	return parseResponse(res);
}
//#endregion
//#region src/api/links.js
async function getAdvancedAnalytics(id, period = "all") {
	return request(`/api/analytics/${id}?period=${period}`);
}
//#endregion
//#region src/components/Skeleton.jsx
function StatCardSkeleton() {
	return /* @__PURE__ */ jsxs("div", {
		className: "stat-card stat-card-loading",
		children: [/* @__PURE__ */ jsx("div", { className: "stat-skeleton" }), /* @__PURE__ */ jsx("div", { className: "stat-skeleton stat-skeleton-label" })]
	});
}
function CardSkeleton() {
	return /* @__PURE__ */ jsxs("div", {
		className: "card-skeleton",
		children: [
			/* @__PURE__ */ jsx("div", {
				className: "skeleton",
				style: {
					height: "24px",
					width: "40%",
					marginBottom: "16px"
				}
			}),
			/* @__PURE__ */ jsx("div", {
				className: "skeleton",
				style: {
					height: "16px",
					width: "80%",
					marginBottom: "8px"
				}
			}),
			/* @__PURE__ */ jsx("div", {
				className: "skeleton",
				style: {
					height: "16px",
					width: "60%",
					marginBottom: "8px"
				}
			}),
			/* @__PURE__ */ jsx("div", {
				className: "skeleton",
				style: {
					height: "16px",
					width: "70%"
				}
			})
		]
	});
}
function HealthCardSkeleton() {
	return /* @__PURE__ */ jsxs("div", {
		className: "health-card health-card-loading",
		children: [/* @__PURE__ */ jsx("span", {
			className: "health-dot skeleton",
			"aria-hidden": "true"
		}), /* @__PURE__ */ jsxs("div", {
			className: "health-card-info",
			children: [/* @__PURE__ */ jsx("div", {
				className: "skeleton",
				style: {
					height: "14px",
					width: "120px",
					marginBottom: "8px"
				}
			}), /* @__PURE__ */ jsx("div", {
				className: "skeleton",
				style: {
					height: "20px",
					width: "80px"
				}
			})]
		})]
	});
}
function AnalyticsSkeleton() {
	return /* @__PURE__ */ jsxs("div", {
		className: "analytics-skeleton-grid",
		children: [
			/* @__PURE__ */ jsx("div", {
				className: "analytics-skeleton-exec",
				children: /* @__PURE__ */ jsx(CardSkeleton, {})
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "analytics-skeleton-kpi",
				children: [
					/* @__PURE__ */ jsx(StatCardSkeleton, {}),
					/* @__PURE__ */ jsx(StatCardSkeleton, {}),
					/* @__PURE__ */ jsx(StatCardSkeleton, {}),
					/* @__PURE__ */ jsx(StatCardSkeleton, {})
				]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "analytics-skeleton-health",
				children: /* @__PURE__ */ jsx(HealthCardSkeleton, {})
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "analytics-skeleton-cards",
				children: [/* @__PURE__ */ jsx(CardSkeleton, {}), /* @__PURE__ */ jsx(CardSkeleton, {})]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "analytics-skeleton-chart",
				children: /* @__PURE__ */ jsx("div", {
					className: "skeleton",
					style: { height: "300px" }
				})
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "analytics-skeleton-charts",
				children: [/* @__PURE__ */ jsx("div", {
					className: "skeleton",
					style: { height: "200px" }
				}), /* @__PURE__ */ jsx("div", {
					className: "skeleton",
					style: { height: "200px" }
				})]
			})
		]
	});
}
//#endregion
//#region src/utils/health.js
var HEALTH_META = {
	Excellent: {
		emoji: "🟢",
		className: "health-excellent"
	},
	Good: {
		emoji: "🔵",
		className: "health-good"
	},
	Average: {
		emoji: "🟠",
		className: "health-average"
	},
	Poor: {
		emoji: "🔴",
		className: "health-poor"
	},
	Critical: {
		emoji: "⛔",
		className: "health-critical"
	}
};
function healthMeta(label) {
	return HEALTH_META[label] || HEALTH_META.Critical;
}
//#endregion
//#region src/utils/prediction.js
function getPredictionColor(trend) {
	if (trend === "Growing") return "green";
	if (trend === "Declining") return "orange";
	return "blue";
}
//#endregion
//#region src/utils/dashboardSummary.js
function getPriorityColor(priority) {
	if (priority === "HIGH") return "red";
	if (priority === "MEDIUM") return "orange";
	return "green";
}
//#endregion
//#region src/pages/Analytics.jsx
var PERIODS = [
	{
		value: "today",
		label: "Today"
	},
	{
		value: "7d",
		label: "Last 7 Days"
	},
	{
		value: "30d",
		label: "Last 30 Days"
	},
	{
		value: "90d",
		label: "Last 90 Days"
	},
	{
		value: "all",
		label: "All Time"
	}
];
var CHART_COLORS = [
	"#4361ee",
	"#7209b7",
	"#f72585",
	"#4cc9f0",
	"#4895ef",
	"#560bad",
	"#b5179e",
	"#3a0ca3",
	"#4361ee",
	"#4cc9f0",
	"#06d6a0",
	"#ffd166",
	"#ef476f",
	"#118ab2",
	"#073b4c"
];
function KPICard({ label, value }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "stat-card",
		children: [/* @__PURE__ */ jsx("span", {
			className: "stat-value",
			children: value
		}), /* @__PURE__ */ jsx("span", {
			className: "stat-label",
			children: label
		})]
	});
}
function ChartCard({ title, children, className }) {
	return /* @__PURE__ */ jsxs("div", {
		className: `analytics-card ${className || ""}`,
		children: [/* @__PURE__ */ jsx("h3", {
			className: "analytics-card-title",
			children: title
		}), children]
	});
}
function BreakdownList({ data }) {
	const entries = useMemo(() => Object.entries(data), [data]);
	const total = useMemo(() => entries.reduce((sum, [, v]) => sum + v, 0), [entries]);
	if (total === 0) return /* @__PURE__ */ jsx("p", {
		className: "empty-msg",
		children: "No data available."
	});
	return /* @__PURE__ */ jsx("ul", {
		className: "breakdown-list",
		children: entries.map(([label, count]) => /* @__PURE__ */ jsxs("li", {
			className: "breakdown-item",
			children: [
				/* @__PURE__ */ jsx("span", {
					className: "breakdown-label",
					children: label
				}),
				/* @__PURE__ */ jsx("span", {
					className: "breakdown-value",
					children: count
				}),
				/* @__PURE__ */ jsx("span", {
					className: "breakdown-bar-track",
					children: /* @__PURE__ */ jsx("span", {
						className: "breakdown-bar-fill",
						style: { width: `${count / total * 100}%` }
					})
				})
			]
		}, label))
	});
}
function HourlyHeatmap({ data }) {
	const maxClicks = useMemo(() => Math.max(...data.map((d) => d.clicks), 1), [data]);
	return /* @__PURE__ */ jsx("div", {
		className: "hourly-heatmap",
		role: "img",
		"aria-label": "Hourly click distribution",
		children: data.map((d) => {
			const intensity = d.clicks / maxClicks;
			return /* @__PURE__ */ jsxs("div", {
				className: "heatmap-cell",
				title: `${d.hour}:00 - ${d.clicks} clicks`,
				children: [/* @__PURE__ */ jsx("div", {
					className: "heatmap-fill",
					style: { backgroundColor: `rgba(67, 97, 238, ${Math.max(intensity * .9, .05)})` }
				}), /* @__PURE__ */ jsx("span", {
					className: "heatmap-label",
					children: d.hour
				})]
			}, d.hour);
		})
	});
}
function PieChartBreakdown({ data }) {
	const entries = useMemo(() => Object.entries(data), [data]);
	const total = useMemo(() => entries.reduce((sum, [, v]) => sum + v, 0), [entries]);
	const chartData = useMemo(() => entries.map(([name, value]) => ({
		name,
		value
	})), [entries]);
	if (total === 0) return /* @__PURE__ */ jsx("p", {
		className: "empty-msg",
		children: "No data available."
	});
	return /* @__PURE__ */ jsx("div", {
		className: "pie-chart-container",
		children: /* @__PURE__ */ jsx(ResponsiveContainer, {
			width: "100%",
			height: 250,
			children: /* @__PURE__ */ jsxs(PieChart, { children: [
				/* @__PURE__ */ jsx(Pie, {
					data: chartData,
					cx: "50%",
					cy: "50%",
					innerRadius: 50,
					outerRadius: 90,
					paddingAngle: 2,
					dataKey: "value",
					label: ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`,
					labelLine: false,
					children: chartData.map((_, index) => /* @__PURE__ */ jsx(Cell, { fill: CHART_COLORS[index % CHART_COLORS.length] }, `cell-${index}`))
				}),
				/* @__PURE__ */ jsx(Tooltip, { formatter: (value, name) => [`${value} clicks`, name] }),
				/* @__PURE__ */ jsx(Legend, {})
			] })
		})
	});
}
function Analytics() {
	const { id } = useParams();
	const navigate = useNavigate();
	const linkInfo = useLocation().state;
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [period, setPeriod] = useState("all");
	const fetchAnalytics = useCallback(async (p) => {
		setLoading(true);
		setError(null);
		try {
			const result = await getAdvancedAnalytics(id, p);
			setData(result);
		} catch (err) {
			setError(err.message);
			toast.error(err.message);
		} finally {
			setLoading(false);
		}
	}, [id]);
	useEffect(() => {
		fetchAnalytics(period);
	}, [period, fetchAnalytics]);
	function handlePeriodChange(newPeriod) {
		setPeriod(newPeriod);
	}
	if (loading && !data) return /* @__PURE__ */ jsxs("div", {
		className: "analytics-page",
		children: [/* @__PURE__ */ jsx("button", {
			className: "btn btn-back",
			onClick: () => navigate("/dashboard"),
			"aria-label": "Back to Dashboard",
			children: "← Back to Dashboard"
		}), /* @__PURE__ */ jsx(AnalyticsSkeleton, {})]
	});
	if (!data && error) return /* @__PURE__ */ jsxs("div", {
		className: "analytics-page",
		children: [/* @__PURE__ */ jsx("button", {
			className: "btn btn-back",
			onClick: () => navigate("/dashboard"),
			"aria-label": "Back to Dashboard",
			children: "← Back to Dashboard"
		}), /* @__PURE__ */ jsx("div", {
			className: "analytics-card",
			children: /* @__PURE__ */ jsxs("div", {
				className: "empty-state",
				children: [
					/* @__PURE__ */ jsx("div", {
						className: "empty-state-icon",
						children: "⚠"
					}),
					/* @__PURE__ */ jsx("h3", { children: "Could not load analytics" }),
					/* @__PURE__ */ jsx("p", { children: error }),
					/* @__PURE__ */ jsx("button", {
						className: "btn btn-primary",
						onClick: () => fetchAnalytics(period),
						children: "Try Again"
					})
				]
			})
		})]
	});
	if (!data) return null;
	return /* @__PURE__ */ jsxs("div", {
		className: "analytics-page",
		children: [
			/* @__PURE__ */ jsx("button", {
				className: "btn btn-back",
				onClick: () => navigate("/dashboard"),
				"aria-label": "Back to Dashboard",
				children: "← Back to Dashboard"
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "analytics-header",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
					className: "analytics-title",
					children: data.link?.shortCode ? `/${data.link.shortCode}` : linkInfo?.shortCode ? `/${linkInfo.shortCode}` : "Link Analytics"
				}), data.link?.originalUrl && /* @__PURE__ */ jsx("p", {
					className: "analytics-original",
					title: data.link.originalUrl,
					children: data.link.originalUrl
				})] }), /* @__PURE__ */ jsx("div", {
					className: "period-selector",
					children: PERIODS.map((p) => /* @__PURE__ */ jsx("button", {
						className: `btn btn-sm ${period === p.value ? "btn-primary" : "btn-page"}`,
						onClick: () => handlePeriodChange(p.value),
						disabled: loading,
						"aria-pressed": period === p.value,
						children: p.label
					}, p.value))
				})]
			}),
			loading && /* @__PURE__ */ jsx("div", {
				className: "loading-overlay",
				role: "status",
				"aria-live": "polite",
				children: /* @__PURE__ */ jsx("span", { className: "spinner" })
			}),
			data.link?.isFlagged && /* @__PURE__ */ jsxs("div", {
				className: "analytics-warning",
				role: "alert",
				children: [/* @__PURE__ */ jsx("span", {
					className: "analytics-warning-icon",
					children: "⚠"
				}), "Suspicious traffic detected"]
			}),
			data.dashboardSummary && /* @__PURE__ */ jsxs("div", {
				className: "analytics-card executive-card",
				children: [
					/* @__PURE__ */ jsx("h3", {
						className: "analytics-card-title",
						children: "🤖 AI Executive Summary"
					}),
					/* @__PURE__ */ jsx("h4", {
						className: "executive-title",
						children: data.dashboardSummary.title
					}),
					/* @__PURE__ */ jsx("p", {
						className: "executive-overview",
						children: data.dashboardSummary.overview
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "executive-priority",
						children: [/* @__PURE__ */ jsx("span", {
							className: "executive-priority-label",
							children: "Priority"
						}), /* @__PURE__ */ jsx("span", {
							className: `executive-priority-badge priority-${getPriorityColor(data.dashboardSummary.priority)}`,
							children: data.dashboardSummary.priority
						})]
					}),
					/* @__PURE__ */ jsx("ul", {
						className: "executive-highlights",
						children: data.dashboardSummary.highlights.map((item, i) => /* @__PURE__ */ jsx("li", { children: item }, i))
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "analytics-kpi-grid",
				children: [
					/* @__PURE__ */ jsx(KPICard, {
						label: "Total Clicks",
						value: data.totalClicks
					}),
					/* @__PURE__ */ jsx(KPICard, {
						label: "Unique Visitors",
						value: data.uniqueClicks
					}),
					/* @__PURE__ */ jsx(KPICard, {
						label: "Real Clicks",
						value: data.realClicks
					}),
					/* @__PURE__ */ jsx(KPICard, {
						label: "Bot Clicks",
						value: data.botClicks
					})
				]
			}),
			data.healthScore !== void 0 && /* @__PURE__ */ jsxs("div", {
				className: "health-card",
				children: [/* @__PURE__ */ jsx("span", {
					className: `health-dot ${healthMeta(data.healthLabel).className}`,
					"aria-hidden": "true"
				}), /* @__PURE__ */ jsxs("div", {
					className: "health-card-info",
					children: [
						/* @__PURE__ */ jsx("span", {
							className: "health-card-title",
							children: "Health Score"
						}),
						/* @__PURE__ */ jsxs("span", {
							className: "health-card-score",
							children: [data.healthScore, " / 100"]
						}),
						/* @__PURE__ */ jsx("span", {
							className: "health-card-sub",
							children: data.healthLabel
						})
					]
				})]
			}),
			data.summary && /* @__PURE__ */ jsxs("div", {
				className: "analytics-card recommendations-card",
				children: [
					/* @__PURE__ */ jsx("h3", {
						className: "analytics-card-title",
						children: "AI Recommendations"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "ai-summary",
						children: data.summary
					}),
					/* @__PURE__ */ jsx("ul", {
						className: "recommendation-list",
						children: data.recommendations.map((rec, i) => /* @__PURE__ */ jsx("li", { children: rec }, i))
					})
				]
			}),
			data.prediction && /* @__PURE__ */ jsxs("div", {
				className: "analytics-card prediction-card",
				children: [
					/* @__PURE__ */ jsx("h3", {
						className: "analytics-card-title",
						children: "📈 Performance Prediction"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "prediction-grid",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "prediction-metric",
								children: [
									/* @__PURE__ */ jsx("span", {
										className: "prediction-label",
										children: "Predicted Next 7 Days"
									}),
									/* @__PURE__ */ jsx("span", {
										className: "prediction-value",
										children: data.prediction.predictedClicks
									}),
									/* @__PURE__ */ jsx("span", {
										className: "prediction-unit",
										children: "Clicks"
									})
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "prediction-metric",
								children: [/* @__PURE__ */ jsx("span", {
									className: "prediction-label",
									children: "Trend"
								}), /* @__PURE__ */ jsx("span", {
									className: `prediction-trend ${getPredictionColor(data.prediction.trend)}`,
									children: data.prediction.trend
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "prediction-metric",
								children: [/* @__PURE__ */ jsx("span", {
									className: "prediction-label",
									children: "Confidence"
								}), /* @__PURE__ */ jsxs("span", {
									className: "prediction-value",
									children: [data.prediction.confidence, "%"]
								})]
							})
						]
					}),
					/* @__PURE__ */ jsx("p", {
						className: "prediction-message",
						children: data.prediction.message
					})
				]
			}),
			data.trafficInsights && /* @__PURE__ */ jsxs("div", {
				className: "analytics-card traffic-card",
				children: [
					/* @__PURE__ */ jsx("h3", {
						className: "analytics-card-title",
						children: "🌎 Smart Traffic Insights"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "traffic-grid",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "traffic-item",
								children: [/* @__PURE__ */ jsx("span", {
									className: "traffic-label",
									children: "Best Hour"
								}), /* @__PURE__ */ jsx("span", {
									className: "traffic-value",
									children: data.trafficInsights.bestHour || "—"
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "traffic-item",
								children: [/* @__PURE__ */ jsx("span", {
									className: "traffic-label",
									children: "Best Day"
								}), /* @__PURE__ */ jsx("span", {
									className: "traffic-value",
									children: data.trafficInsights.bestDay || "—"
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "traffic-item",
								children: [/* @__PURE__ */ jsx("span", {
									className: "traffic-label",
									children: "Best Device"
								}), /* @__PURE__ */ jsx("span", {
									className: "traffic-value",
									children: data.trafficInsights.bestDevice || "—"
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "traffic-item",
								children: [/* @__PURE__ */ jsx("span", {
									className: "traffic-label",
									children: "Best Browser"
								}), /* @__PURE__ */ jsx("span", {
									className: "traffic-value",
									children: data.trafficInsights.bestBrowser || "—"
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "traffic-item",
								children: [/* @__PURE__ */ jsx("span", {
									className: "traffic-label",
									children: "Best Country"
								}), /* @__PURE__ */ jsx("span", {
									className: "traffic-value",
									children: data.trafficInsights.bestCountry || "—"
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "traffic-item",
								children: [/* @__PURE__ */ jsx("span", {
									className: "traffic-label",
									children: "Best Referrer"
								}), /* @__PURE__ */ jsx("span", {
									className: "traffic-value",
									children: data.trafficInsights.bestReferrer || "—"
								})]
							})
						]
					}),
					/* @__PURE__ */ jsx("p", {
						className: "traffic-message",
						children: data.trafficInsights.insight
					})
				]
			}),
			data.optimization && /* @__PURE__ */ jsxs("div", {
				className: "analytics-card optimization-card",
				children: [
					/* @__PURE__ */ jsx("h3", {
						className: "analytics-card-title",
						children: "⚙ Link Optimization"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "optimization-score-row",
						children: [/* @__PURE__ */ jsx("span", {
							className: "optimization-score",
							children: data.optimization.optimizationScore
						}), /* @__PURE__ */ jsx("span", {
							className: "optimization-label",
							children: data.optimization.optimizationLabel
						})]
					}),
					/* @__PURE__ */ jsx("ul", {
						className: "optimization-list",
						children: data.optimization.improvements.map((item, i) => /* @__PURE__ */ jsxs("li", { children: ["✓ ", item] }, i))
					})
				]
			}),
			data.totalClicks === 0 ? /* @__PURE__ */ jsx("div", {
				className: "analytics-card",
				children: /* @__PURE__ */ jsxs("div", {
					className: "empty-state",
					children: [
						/* @__PURE__ */ jsx("div", {
							className: "empty-state-icon",
							children: "📈"
						}),
						/* @__PURE__ */ jsx("h3", { children: "No clicks yet" }),
						/* @__PURE__ */ jsx("p", { children: "Share your link to start collecting analytics data." })
					]
				})
			}) : /* @__PURE__ */ jsxs(Fragment, { children: [
				/* @__PURE__ */ jsx(ChartCard, {
					title: "Click Trend",
					className: "analytics-chart-full",
					children: /* @__PURE__ */ jsx("div", {
						className: "chart-container",
						children: /* @__PURE__ */ jsx(ResponsiveContainer, {
							width: "100%",
							height: 300,
							children: /* @__PURE__ */ jsxs(LineChart, {
								data: data.dailyTrend,
								children: [
									/* @__PURE__ */ jsx(CartesianGrid, {
										strokeDasharray: "3 3",
										stroke: "#f0f0f0"
									}),
									/* @__PURE__ */ jsx(XAxis, {
										dataKey: "date",
										tick: { fontSize: 12 },
										tickFormatter: (v) => v.slice(5)
									}),
									/* @__PURE__ */ jsx(YAxis, {
										tick: { fontSize: 12 },
										allowDecimals: false
									}),
									/* @__PURE__ */ jsx(Tooltip, {}),
									/* @__PURE__ */ jsx(Line, {
										type: "monotone",
										dataKey: "clicks",
										stroke: "#4361ee",
										strokeWidth: 2,
										dot: false,
										activeDot: { r: 5 }
									})
								]
							})
						})
					})
				}),
				/* @__PURE__ */ jsx(ChartCard, {
					title: "Weekly Trend",
					className: "analytics-chart-full",
					children: /* @__PURE__ */ jsx("div", {
						className: "chart-container",
						children: /* @__PURE__ */ jsx(ResponsiveContainer, {
							width: "100%",
							height: 250,
							children: /* @__PURE__ */ jsxs(BarChart, {
								data: data.weeklyTrend,
								children: [
									/* @__PURE__ */ jsx(CartesianGrid, {
										strokeDasharray: "3 3",
										stroke: "#f0f0f0"
									}),
									/* @__PURE__ */ jsx(XAxis, {
										dataKey: "date",
										tick: { fontSize: 12 },
										tickFormatter: (v) => v.slice(5)
									}),
									/* @__PURE__ */ jsx(YAxis, {
										tick: { fontSize: 12 },
										allowDecimals: false
									}),
									/* @__PURE__ */ jsx(Tooltip, {}),
									/* @__PURE__ */ jsx(Bar, {
										dataKey: "clicks",
										fill: "#4361ee",
										radius: [
											4,
											4,
											0,
											0
										]
									})
								]
							})
						})
					})
				}),
				/* @__PURE__ */ jsx(ChartCard, {
					title: "Monthly Trend",
					className: "analytics-chart-full",
					children: /* @__PURE__ */ jsx("div", {
						className: "chart-container",
						children: /* @__PURE__ */ jsx(ResponsiveContainer, {
							width: "100%",
							height: 250,
							children: /* @__PURE__ */ jsxs(BarChart, {
								data: data.monthlyTrend,
								children: [
									/* @__PURE__ */ jsx(CartesianGrid, {
										strokeDasharray: "3 3",
										stroke: "#f0f0f0"
									}),
									/* @__PURE__ */ jsx(XAxis, {
										dataKey: "month",
										tick: { fontSize: 12 }
									}),
									/* @__PURE__ */ jsx(YAxis, {
										tick: { fontSize: 12 },
										allowDecimals: false
									}),
									/* @__PURE__ */ jsx(Tooltip, {}),
									/* @__PURE__ */ jsx(Bar, {
										dataKey: "clicks",
										fill: "#7209b7",
										radius: [
											4,
											4,
											0,
											0
										]
									})
								]
							})
						})
					})
				}),
				/* @__PURE__ */ jsx(ChartCard, {
					title: "Hourly Distribution",
					className: "analytics-chart-full",
					children: /* @__PURE__ */ jsx(HourlyHeatmap, { data: data.hourlyDistribution })
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "analytics-grid-3",
					children: [
						/* @__PURE__ */ jsx(ChartCard, {
							title: "Browser Breakdown",
							children: /* @__PURE__ */ jsx(PieChartBreakdown, { data: data.browserBreakdown })
						}),
						/* @__PURE__ */ jsx(ChartCard, {
							title: "Operating System",
							children: /* @__PURE__ */ jsx(PieChartBreakdown, { data: data.osBreakdown })
						}),
						/* @__PURE__ */ jsx(ChartCard, {
							title: "Device Breakdown",
							children: /* @__PURE__ */ jsx(PieChartBreakdown, { data: data.deviceBreakdown })
						})
					]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "analytics-grid-2",
					children: [/* @__PURE__ */ jsx(ChartCard, {
						title: "Top Referrers",
						children: /* @__PURE__ */ jsx(BreakdownList, { data: data.referrerBreakdown })
					}), /* @__PURE__ */ jsx(ChartCard, {
						title: "Top Countries",
						children: /* @__PURE__ */ jsx(BreakdownList, { data: data.countryBreakdown })
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "analytics-comparison-grid",
					children: [/* @__PURE__ */ jsx(ChartCard, {
						title: "Bot vs Real",
						children: /* @__PURE__ */ jsxs("div", {
							className: "comparison-bars",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "comparison-row",
								children: [
									/* @__PURE__ */ jsx("span", {
										className: "comparison-label",
										children: "Real"
									}),
									/* @__PURE__ */ jsx("div", {
										className: "comparison-track",
										children: /* @__PURE__ */ jsx("div", {
											className: "comparison-fill comparison-fill-human",
											style: { width: data.totalClicks ? `${data.humanClicks / data.totalClicks * 100}%` : "0%" }
										})
									}),
									/* @__PURE__ */ jsx("span", {
										className: "comparison-value",
										children: data.humanClicks
									})
								]
							}), /* @__PURE__ */ jsxs("div", {
								className: "comparison-row",
								children: [
									/* @__PURE__ */ jsx("span", {
										className: "comparison-label",
										children: "Bot"
									}),
									/* @__PURE__ */ jsx("div", {
										className: "comparison-track",
										children: /* @__PURE__ */ jsx("div", {
											className: "comparison-fill comparison-fill-bot",
											style: { width: data.totalClicks ? `${data.botClicks / data.totalClicks * 100}%` : "0%" }
										})
									}),
									/* @__PURE__ */ jsx("span", {
										className: "comparison-value",
										children: data.botClicks
									})
								]
							})]
						})
					}), /* @__PURE__ */ jsx(ChartCard, {
						title: "Protected vs Public",
						children: /* @__PURE__ */ jsxs("div", {
							className: "comparison-bars",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "comparison-row",
								children: [
									/* @__PURE__ */ jsx("span", {
										className: "comparison-label",
										children: "Public"
									}),
									/* @__PURE__ */ jsx("div", {
										className: "comparison-track",
										children: /* @__PURE__ */ jsx("div", {
											className: "comparison-fill comparison-fill-public",
											style: { width: data.totalClicks ? `${data.publicClicks / data.totalClicks * 100}%` : "0%" }
										})
									}),
									/* @__PURE__ */ jsx("span", {
										className: "comparison-value",
										children: data.publicClicks
									})
								]
							}), /* @__PURE__ */ jsxs("div", {
								className: "comparison-row",
								children: [
									/* @__PURE__ */ jsx("span", {
										className: "comparison-label",
										children: "Protected"
									}),
									/* @__PURE__ */ jsx("div", {
										className: "comparison-track",
										children: /* @__PURE__ */ jsx("div", {
											className: "comparison-fill comparison-fill-protected",
											style: { width: data.totalClicks ? `${data.protectedClicks / data.totalClicks * 100}%` : "0%" }
										})
									}),
									/* @__PURE__ */ jsx("span", {
										className: "comparison-value",
										children: data.protectedClicks
									})
								]
							})]
						})
					})]
				})
			] })
		]
	});
}
//#endregion
//#region ssr-error-harness.jsx
var dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", {
	value: dom.window.navigator,
	configurable: true,
	writable: true
});
globalThis.localStorage = dom.window.localStorage;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.SVGElement = dom.window.SVGElement;
globalThis.ResizeObserver = class {
	constructor(cb) {
		this.cb = cb;
	}
	observe() {
		this.cb([{ contentRect: {
			width: 800,
			height: 400
		} }], this);
	}
	unobserve() {}
	disconnect() {}
};
globalThis.matchMedia = () => ({
	matches: false,
	addEventListener() {},
	removeEventListener() {},
	addListener() {},
	removeListener() {}
});
globalThis.window.matchMedia = globalThis.matchMedia;
globalThis.MutationObserver = dom.window.MutationObserver;
var SCENARIO = process.env.SCENARIO || "network";
globalThis.fetch = async () => {
	if (SCENARIO === "network") throw new TypeError("Failed to fetch");
	if (SCENARIO === "500") return {
		ok: false,
		status: 500,
		text: async () => "{\"error\":\"boom\"}"
	};
	if (SCENARIO === "401") return {
		ok: false,
		status: 401,
		text: async () => "{\"error\":\"unauthorized\"}"
	};
	if (SCENARIO === "500html") return {
		ok: false,
		status: 500,
		text: async () => "<html>Internal Server Error</html>"
	};
	return {
		ok: true,
		status: 200,
		text: async () => "{}"
	};
};
process.on("uncaughtException", (err) => {
	console.log(`=== UNCAUGHT EXCEPTION (${SCENARIO}) ===`);
	console.log(err && err.stack ? err.stack : err);
	process.exit(1);
});
process.on("unhandledRejection", (err) => {
	console.log(`=== UNHANDLED REJECTION (${SCENARIO}) ===`);
	console.log(err && err.stack ? err.stack : err);
	process.exit(1);
});
var rootEl = document.getElementById("root");
createRoot(rootEl).render(/* @__PURE__ */ jsxs(StrictMode, { children: [/* @__PURE__ */ jsx(Toaster, {
	position: "top-right",
	toastOptions: { duration: 4e3 }
}), /* @__PURE__ */ jsx(MemoryRouter, {
	initialEntries: ["/analytics/11111111-1111-1111-1111-111111111111"],
	children: /* @__PURE__ */ jsx(Routes, { children: /* @__PURE__ */ jsx(Route, {
		path: "/analytics/:id",
		element: /* @__PURE__ */ jsx(Analytics, {})
	}) })
})] }));
setTimeout(() => {
	const html = rootEl.innerHTML;
	console.log(`SCENARIO=${SCENARIO} RENDERED LENGTH:`, html.length);
	console.log("has error card:", html.includes("Could not load analytics"));
	console.log("has analytics-page:", html.includes("analytics-page"));
	process.exit(0);
}, 1200);
//#endregion
export {};
