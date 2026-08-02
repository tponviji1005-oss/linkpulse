import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { StrictMode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import toast, { Toaster } from "react-hot-toast";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
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
async function requestBlob(path) {
	let res;
	try {
		res = await fetch(`${BASE_URL}${path}`, { headers: buildHeaders() });
	} catch {
		throw new ApiError("Network error. Please check your connection and try again.");
	}
	if (!res.ok) {
		const data = await textOrNull(res);
		throw new ApiError(data && (data.error || data.message) || messageForStatus(res.status), res.status);
	}
	return res.blob();
}
//#endregion
//#region src/api/auth.js
async function login(email, password) {
	return request("/api/auth/login", {
		method: "POST",
		body: JSON.stringify({
			email,
			password
		})
	});
}
async function register(name, email, password) {
	return request("/api/auth/register", {
		method: "POST",
		body: JSON.stringify({
			name,
			email,
			password
		})
	});
}
//#endregion
//#region src/context/AuthContext.jsx
var AuthContext = createContext(null);
function AuthProvider({ children }) {
	const [user, setUser] = useState(null);
	const [token, setToken] = useState(() => localStorage.getItem("token"));
	const [loading, setLoading] = useState(true);
	useEffect(() => {
		if (token) {
			const stored = localStorage.getItem("user");
			if (stored) try {
				setUser(JSON.parse(stored));
			} catch {
				localStorage.removeItem("user");
			}
		}
		setLoading(false);
	}, []);
	function handleAuth(data) {
		const t = data.token || data.accessToken;
		const u = data.user || data;
		localStorage.setItem("token", t);
		localStorage.setItem("user", JSON.stringify(u));
		setToken(t);
		setUser(u);
	}
	async function login$1(email, password) {
		const data = await login(email, password);
		handleAuth(data);
		return data;
	}
	async function register$1(name, email, password) {
		const data = await register(name, email, password);
		handleAuth(data);
		return data;
	}
	function logout() {
		localStorage.removeItem("token");
		localStorage.removeItem("user");
		setToken(null);
		setUser(null);
	}
	return /* @__PURE__ */ jsx(AuthContext.Provider, {
		value: {
			user,
			token,
			loading,
			login: login$1,
			register: register$1,
			logout
		},
		children
	});
}
function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
}
//#endregion
//#region src/components/Navbar.jsx
function Navbar() {
	const { user, logout } = useAuth();
	return /* @__PURE__ */ jsxs("nav", {
		className: "navbar",
		children: [/* @__PURE__ */ jsx(Link, {
			to: "/",
			className: "navbar-brand",
			children: "LinkPulse"
		}), /* @__PURE__ */ jsx("div", {
			className: "navbar-links",
			children: user ? /* @__PURE__ */ jsxs(Fragment, { children: [
				/* @__PURE__ */ jsx(Link, {
					to: "/dashboard",
					className: "nav-link",
					children: "Dashboard"
				}),
				/* @__PURE__ */ jsx(Link, {
					to: "/bulk",
					className: "nav-link",
					children: "Bulk"
				}),
				/* @__PURE__ */ jsx("span", {
					className: "navbar-user",
					children: user.name || user.email
				}),
				/* @__PURE__ */ jsx("button", {
					onClick: logout,
					className: "btn btn-outline",
					"aria-label": "Log out",
					children: "Logout"
				})
			] }) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Link, {
				to: "/login",
				className: "btn btn-outline",
				children: "Login"
			}), /* @__PURE__ */ jsx(Link, {
				to: "/register",
				className: "btn btn-primary",
				children: "Register"
			})] })
		})]
	});
}
//#endregion
//#region src/pages/Login.jsx
function Login() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const { login } = useAuth();
	const navigate = useNavigate();
	async function handleSubmit(e) {
		e.preventDefault();
		setLoading(true);
		try {
			await login(email, password);
			toast.success("Welcome back!");
			navigate("/dashboard");
		} catch (err) {
			toast.error(err.message);
		} finally {
			setLoading(false);
		}
	}
	return /* @__PURE__ */ jsx("div", {
		className: "auth-page",
		children: /* @__PURE__ */ jsxs("form", {
			className: "auth-form",
			onSubmit: handleSubmit,
			children: [
				/* @__PURE__ */ jsx("h2", { children: "Login" }),
				/* @__PURE__ */ jsx("input", {
					type: "email",
					placeholder: "Email",
					value: email,
					onChange: (e) => setEmail(e.target.value),
					required: true,
					className: "input",
					"aria-label": "Email"
				}),
				/* @__PURE__ */ jsx("input", {
					type: "password",
					placeholder: "Password",
					value: password,
					onChange: (e) => setPassword(e.target.value),
					required: true,
					className: "input",
					"aria-label": "Password"
				}),
				/* @__PURE__ */ jsx("button", {
					type: "submit",
					className: "btn btn-primary btn-block",
					disabled: loading,
					children: loading ? "Logging in..." : "Login"
				}),
				/* @__PURE__ */ jsxs("p", {
					className: "auth-switch",
					children: ["Don't have an account? ", /* @__PURE__ */ jsx(Link, {
						to: "/register",
						children: "Register"
					})]
				})
			]
		})
	});
}
//#endregion
//#region src/pages/Register.jsx
function Register() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const { register } = useAuth();
	const navigate = useNavigate();
	async function handleSubmit(e) {
		e.preventDefault();
		setLoading(true);
		try {
			await register(name, email, password);
			toast.success("Account created!");
			navigate("/dashboard");
		} catch (err) {
			toast.error(err.message);
		} finally {
			setLoading(false);
		}
	}
	return /* @__PURE__ */ jsx("div", {
		className: "auth-page",
		children: /* @__PURE__ */ jsxs("form", {
			className: "auth-form",
			onSubmit: handleSubmit,
			children: [
				/* @__PURE__ */ jsx("h2", { children: "Register" }),
				/* @__PURE__ */ jsx("input", {
					type: "text",
					placeholder: "Name",
					value: name,
					onChange: (e) => setName(e.target.value),
					required: true,
					className: "input",
					"aria-label": "Name"
				}),
				/* @__PURE__ */ jsx("input", {
					type: "email",
					placeholder: "Email",
					value: email,
					onChange: (e) => setEmail(e.target.value),
					required: true,
					className: "input",
					"aria-label": "Email"
				}),
				/* @__PURE__ */ jsx("input", {
					type: "password",
					placeholder: "Password",
					value: password,
					onChange: (e) => setPassword(e.target.value),
					required: true,
					minLength: 8,
					className: "input",
					"aria-label": "Password"
				}),
				/* @__PURE__ */ jsx("button", {
					type: "submit",
					className: "btn btn-primary btn-block",
					disabled: loading,
					children: loading ? "Creating account..." : "Register"
				}),
				/* @__PURE__ */ jsxs("p", {
					className: "auth-switch",
					children: ["Already have an account? ", /* @__PURE__ */ jsx(Link, {
						to: "/login",
						children: "Login"
					})]
				})
			]
		})
	});
}
//#endregion
//#region src/api/links.js
async function getDashboard() {
	return request("/api/dashboard");
}
async function getTopLinks() {
	return request("/api/dashboard/top-links");
}
async function getLinks(params = {}) {
	const query = new URLSearchParams();
	if (params.search) query.set("search", params.search);
	if (params.status) query.set("status", params.status);
	if (params.sort) query.set("sort", params.sort);
	if (params.page) query.set("page", params.page);
	if (params.limit) query.set("limit", params.limit);
	const qs = query.toString();
	return request(`/api/links${qs ? "?" + qs : ""}`);
}
async function createLink(originalUrl, options = {}) {
	const body = { originalUrl };
	if (options.customAlias) body.customAlias = options.customAlias;
	if (options.expiresAt) body.expiresAt = options.expiresAt;
	if (options.password) body.password = options.password;
	if (options.maxClicks != null) body.maxClicks = options.maxClicks;
	return request("/api/links", {
		method: "POST",
		body: JSON.stringify(body)
	});
}
async function updateLink(id, data) {
	return request(`/api/links/${id}`, {
		method: "PUT",
		body: JSON.stringify(data)
	});
}
async function deleteLink(id) {
	return request(`/api/links/${id}`, { method: "DELETE" });
}
async function getAdvancedAnalytics(id, period = "all") {
	return request(`/api/analytics/${id}?period=${period}`);
}
async function getLinkQRCode(id) {
	return requestBlob(`/api/links/${id}/qrcode`);
}
async function verifyPassword(id, password) {
	return request(`/api/links/${id}/verify-password`, {
		method: "POST",
		body: JSON.stringify({ password })
	});
}
async function bulkCreateLinks(links) {
	return request("/api/bulk", {
		method: "POST",
		body: JSON.stringify({ links })
	});
}
async function csvUpload(file) {
	const formData = new FormData();
	formData.append("file", file);
	return request("/api/bulk/csv", {
		method: "POST",
		body: formData
	});
}
async function exportCSV() {
	return requestBlob("/api/bulk/export");
}
async function bulkDelete(ids) {
	return request("/api/bulk", {
		method: "DELETE",
		body: JSON.stringify({ ids })
	});
}
async function bulkActivate(ids) {
	return request("/api/bulk/activate", {
		method: "PUT",
		body: JSON.stringify({ ids })
	});
}
async function bulkDeactivate(ids) {
	return request("/api/bulk/deactivate", {
		method: "PUT",
		body: JSON.stringify({ ids })
	});
}
//#endregion
//#region src/components/DashboardStats.jsx
function DashboardStats() {
	const [stats, setStats] = useState(null);
	const [loading, setLoading] = useState(true);
	useEffect(() => {
		let cancelled = false;
		async function fetchStats() {
			try {
				const data = await getDashboard();
				if (!cancelled) setStats(data);
			} catch (err) {
				toast.error(err.message);
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		fetchStats();
		return () => {
			cancelled = true;
		};
	}, []);
	if (loading) return /* @__PURE__ */ jsx("div", {
		className: "stats-grid",
		children: [
			1,
			2,
			3,
			4
		].map((i) => /* @__PURE__ */ jsx("div", {
			className: "stat-card stat-card-loading",
			children: /* @__PURE__ */ jsx("div", { className: "stat-skeleton" })
		}, i))
	});
	if (!stats) return null;
	const cards = [
		{
			label: "Total Links",
			value: stats.totalLinks
		},
		{
			label: "Total Clicks",
			value: stats.totalClicks
		},
		{
			label: "Real Clicks",
			value: stats.realClicks
		},
		{
			label: "Bot Clicks",
			value: stats.botClicks
		},
		{
			label: "Active Links",
			value: stats.activeLinks
		},
		{
			label: "Inactive Links",
			value: stats.inactiveLinks
		}
	];
	return /* @__PURE__ */ jsx("div", {
		className: "stats-grid",
		children: cards.map((card) => /* @__PURE__ */ jsxs("div", {
			className: "stat-card",
			children: [/* @__PURE__ */ jsx("span", {
				className: "stat-value",
				children: card.value
			}), /* @__PURE__ */ jsx("span", {
				className: "stat-label",
				children: card.label
			})]
		}, card.label))
	});
}
//#endregion
//#region src/components/CreateLinkForm.jsx
function CreateLinkForm({ onCreated }) {
	const [originalUrl, setOriginalUrl] = useState("");
	const [customAlias, setCustomAlias] = useState("");
	const [aliasError, setAliasError] = useState("");
	const [password, setPassword] = useState("");
	const [expiresAt, setExpiresAt] = useState("");
	const [maxClicks, setMaxClicks] = useState("");
	const [loading, setLoading] = useState(false);
	const [showOptions, setShowOptions] = useState(false);
	async function handleSubmit(e) {
		e.preventDefault();
		setLoading(true);
		setAliasError("");
		try {
			await createLink(originalUrl, {
				customAlias: customAlias.trim() || void 0,
				password: password || void 0,
				expiresAt: expiresAt || void 0,
				maxClicks: maxClicks ? Number(maxClicks) : void 0
			});
			setOriginalUrl("");
			setCustomAlias("");
			setPassword("");
			setExpiresAt("");
			setMaxClicks("");
			setShowOptions(false);
			toast.success("Link created");
			onCreated();
		} catch (err) {
			if (err.status === 409 || /alias/i.test(err.message)) setAliasError(err.message);
			else toast.error(err.message);
		} finally {
			setLoading(false);
		}
	}
	return /* @__PURE__ */ jsxs("form", {
		className: "create-link-form",
		onSubmit: handleSubmit,
		children: [
			/* @__PURE__ */ jsx("h2", { children: "Create Short Link" }),
			/* @__PURE__ */ jsxs("div", {
				className: "form-row",
				children: [/* @__PURE__ */ jsx("input", {
					type: "url",
					placeholder: "https://example.com/long-url",
					value: originalUrl,
					onChange: (e) => setOriginalUrl(e.target.value),
					required: true,
					className: "input",
					"aria-label": "Original URL"
				}), /* @__PURE__ */ jsx("button", {
					type: "submit",
					className: "btn btn-primary",
					disabled: loading,
					children: loading ? "Creating..." : "Create"
				})]
			}),
			/* @__PURE__ */ jsx("button", {
				type: "button",
				className: "btn btn-sm btn-options-toggle",
				onClick: () => setShowOptions(!showOptions),
				"aria-expanded": showOptions,
				"aria-controls": "create-link-options",
				children: showOptions ? "Hide options" : "Protection options"
			}),
			showOptions && /* @__PURE__ */ jsxs("div", {
				className: "form-options",
				id: "create-link-options",
				children: [
					/* @__PURE__ */ jsxs("label", {
						className: "form-option-label",
						children: [
							"Custom alias (optional)",
							/* @__PURE__ */ jsx("input", {
								type: "text",
								placeholder: "e.g. my-summer-sale",
								value: customAlias,
								onChange: (e) => {
									setCustomAlias(e.target.value);
									setAliasError("");
								},
								className: "input"
							}),
							aliasError && /* @__PURE__ */ jsx("span", {
								className: "form-field-error",
								children: aliasError
							}),
							/* @__PURE__ */ jsx("span", {
								className: "form-field-hint",
								children: "3-20 characters, letters, numbers, hyphens, underscores only"
							})
						]
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "form-option-label",
						children: ["Expiration", /* @__PURE__ */ jsx("input", {
							type: "datetime-local",
							value: expiresAt,
							onChange: (e) => setExpiresAt(e.target.value),
							className: "input"
						})]
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "form-option-label",
						children: ["Maximum Clicks (optional)", /* @__PURE__ */ jsx("input", {
							type: "number",
							min: "1",
							placeholder: "Unlimited",
							value: maxClicks,
							onChange: (e) => setMaxClicks(e.target.value),
							className: "input"
						})]
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "form-option-label",
						children: ["Password", /* @__PURE__ */ jsx("input", {
							type: "password",
							placeholder: "Optional password",
							value: password,
							onChange: (e) => setPassword(e.target.value),
							className: "input"
						})]
					})
				]
			})
		]
	});
}
//#endregion
//#region src/components/TopLinks.jsx
function TopLinks() {
	const [links, setLinks] = useState([]);
	const [loading, setLoading] = useState(true);
	useEffect(() => {
		let cancelled = false;
		async function fetchTopLinks() {
			try {
				const data = await getTopLinks();
				if (!cancelled) setLinks(data.topLinks || []);
			} catch (err) {
				toast.error(err.message);
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		fetchTopLinks();
		return () => {
			cancelled = true;
		};
	}, []);
	if (loading) return /* @__PURE__ */ jsxs("div", {
		className: "top-links-card",
		children: [/* @__PURE__ */ jsx("h2", {
			className: "top-links-title",
			children: "Top Performing Links"
		}), /* @__PURE__ */ jsx("div", {
			className: "top-links-loading",
			children: [
				1,
				2,
				3,
				4,
				5
			].map((i) => /* @__PURE__ */ jsx("div", { className: "top-links-skeleton" }, i))
		})]
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "top-links-card",
		children: [/* @__PURE__ */ jsx("h2", {
			className: "top-links-title",
			children: "Top Performing Links"
		}), links.length === 0 ? /* @__PURE__ */ jsx("p", {
			className: "empty-msg",
			children: "No links yet. Create your first short link to see stats here."
		}) : /* @__PURE__ */ jsx("ul", {
			className: "top-links-list",
			children: links.map((link) => /* @__PURE__ */ jsxs("li", {
				className: "top-links-item",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "top-links-info",
					children: [/* @__PURE__ */ jsxs("a", {
						href: `${window.location.protocol}//${window.location.hostname}:5000/${link.shortCode}`,
						target: "_blank",
						rel: "noopener noreferrer",
						className: "short-link",
						children: ["/", link.shortCode]
					}), /* @__PURE__ */ jsx("span", {
						className: "top-links-original",
						title: link.originalUrl,
						children: link.originalUrl
					})]
				}), /* @__PURE__ */ jsx("span", {
					className: "top-links-clicks",
					children: link.clickCount
				})]
			}, link.id))
		})]
	});
}
//#endregion
//#region src/components/EditLinkModal.jsx
function formatDatetimeLocal(dateStr) {
	if (!dateStr) return "";
	const d = new Date(dateStr);
	if (isNaN(d.getTime())) return "";
	const pad = (n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function EditLinkModal({ link, onClose, onSaved }) {
	const [originalUrl, setOriginalUrl] = useState(link.originalUrl);
	const [title, setTitle] = useState(link.title || "");
	const [isActive, setIsActive] = useState(link.isActive);
	const [expiresAt, setExpiresAt] = useState(formatDatetimeLocal(link.expiresAt));
	const [hasExpiry, setHasExpiry] = useState(!!link.expiresAt);
	const [maxClicks, setMaxClicks] = useState(link.maxClicks ?? "");
	const [hasMaxClicks, setHasMaxClicks] = useState(link.maxClicks != null);
	const [password, setPassword] = useState("");
	const [removePassword, setRemovePassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const overlayRef = useRef(null);
	useEffect(() => {
		function handleKey(e) {
			if (e.key === "Escape") onClose();
		}
		document.addEventListener("keydown", handleKey);
		return () => document.removeEventListener("keydown", handleKey);
	}, [onClose]);
	function handleOverlayClick(e) {
		if (e.target === overlayRef.current) onClose();
	}
	async function handleSubmit(e) {
		e.preventDefault();
		setLoading(true);
		try {
			const data = {
				originalUrl,
				title: title || void 0,
				isActive,
				expiresAt: hasExpiry && expiresAt ? expiresAt : null,
				maxClicks: hasMaxClicks && maxClicks ? Number(maxClicks) : null
			};
			if (removePassword) data.password = "";
			else if (password) data.password = password;
			await updateLink(link.id, data);
			toast.success("Link updated");
			onSaved();
			onClose();
		} catch (err) {
			toast.error(err.message);
		} finally {
			setLoading(false);
		}
	}
	return /* @__PURE__ */ jsx("div", {
		className: "modal-overlay",
		ref: overlayRef,
		onClick: handleOverlayClick,
		children: /* @__PURE__ */ jsxs("div", {
			className: "modal-content",
			role: "dialog",
			"aria-modal": "true",
			"aria-labelledby": "edit-link-modal-title",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "modal-header",
				children: [/* @__PURE__ */ jsx("h2", {
					id: "edit-link-modal-title",
					children: "Edit Link"
				}), /* @__PURE__ */ jsx("button", {
					className: "modal-close",
					onClick: onClose,
					"aria-label": "Close dialog",
					children: "×"
				})]
			}), /* @__PURE__ */ jsxs("form", {
				onSubmit: handleSubmit,
				className: "modal-form",
				children: [
					/* @__PURE__ */ jsxs("label", {
						className: "modal-label",
						children: ["Original URL", /* @__PURE__ */ jsx("input", {
							type: "url",
							className: "input",
							value: originalUrl,
							onChange: (e) => setOriginalUrl(e.target.value),
							required: true
						})]
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "modal-label",
						children: ["Title", /* @__PURE__ */ jsx("input", {
							type: "text",
							className: "input",
							value: title,
							onChange: (e) => setTitle(e.target.value),
							placeholder: "Optional title"
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "modal-label",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "modal-checkbox-row",
							children: [/* @__PURE__ */ jsx("input", {
								type: "checkbox",
								id: "edit-has-expiry",
								checked: hasExpiry,
								onChange: (e) => setHasExpiry(e.target.checked)
							}), /* @__PURE__ */ jsx("label", {
								htmlFor: "edit-has-expiry",
								children: "Set expiration"
							})]
						}), hasExpiry && /* @__PURE__ */ jsx("input", {
							type: "datetime-local",
							className: "input",
							value: expiresAt,
							onChange: (e) => setExpiresAt(e.target.value)
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "modal-label",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "modal-checkbox-row",
							children: [/* @__PURE__ */ jsx("input", {
								type: "checkbox",
								id: "edit-has-max-clicks",
								checked: hasMaxClicks,
								onChange: (e) => setHasMaxClicks(e.target.checked)
							}), /* @__PURE__ */ jsx("label", {
								htmlFor: "edit-has-max-clicks",
								children: "Set click limit"
							})]
						}), hasMaxClicks && /* @__PURE__ */ jsx("input", {
							type: "number",
							min: "1",
							className: "input",
							placeholder: "Unlimited",
							value: maxClicks,
							onChange: (e) => setMaxClicks(e.target.value)
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "modal-label",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "modal-checkbox-row",
							children: [/* @__PURE__ */ jsx("input", {
								type: "checkbox",
								id: "edit-remove-pw",
								checked: removePassword,
								onChange: (e) => {
									setRemovePassword(e.target.checked);
									if (e.target.checked) setPassword("");
								},
								disabled: !link.hasPassword
							}), /* @__PURE__ */ jsx("label", {
								htmlFor: "edit-remove-pw",
								children: "Remove password"
							})]
						}), !removePassword && /* @__PURE__ */ jsx("input", {
							type: "password",
							className: "input",
							value: password,
							onChange: (e) => setPassword(e.target.value),
							placeholder: link.hasPassword ? "Leave blank to keep current" : "Optional password"
						})]
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "modal-label modal-checkbox",
						children: [/* @__PURE__ */ jsx("input", {
							type: "checkbox",
							checked: isActive,
							onChange: (e) => setIsActive(e.target.checked)
						}), "Active"]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "modal-actions",
						children: [/* @__PURE__ */ jsx("button", {
							type: "button",
							className: "btn btn-cancel",
							onClick: onClose,
							disabled: loading,
							children: "Cancel"
						}), /* @__PURE__ */ jsx("button", {
							type: "submit",
							className: "btn btn-primary",
							disabled: loading,
							children: loading ? "Saving..." : "Save Changes"
						})]
					})
				]
			})]
		})
	});
}
//#endregion
//#region src/components/QRCodeModal.jsx
function QRCodeModal({ link, onClose }) {
	const [imageUrl, setImageUrl] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const overlayRef = useRef(null);
	useEffect(() => {
		let cancelled = false;
		let objectUrl = null;
		async function fetchQR() {
			try {
				const blob = await getLinkQRCode(link.id);
				if (cancelled) return;
				objectUrl = URL.createObjectURL(blob);
				setImageUrl(objectUrl);
			} catch (err) {
				if (!cancelled) setError(err.message);
				toast.error(err.message);
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		fetchQR();
		return () => {
			cancelled = true;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [link.id]);
	useEffect(() => {
		function handleKey(e) {
			if (e.key === "Escape") onClose();
		}
		document.addEventListener("keydown", handleKey);
		return () => document.removeEventListener("keydown", handleKey);
	}, [onClose]);
	function handleOverlayClick(e) {
		if (e.target === overlayRef.current) onClose();
	}
	function handleDownload() {
		const a = document.createElement("a");
		a.href = imageUrl;
		a.download = `qr-${link.shortCode}.png`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	}
	function handleCopyUrl() {
		const shortUrl = `${window.location.protocol}//${window.location.hostname}:5000/${link.shortCode}`;
		navigator.clipboard.writeText(shortUrl).then(() => toast.success("Short URL copied"), () => toast.error("Failed to copy"));
	}
	const shortUrl = `${window.location.protocol}//${window.location.hostname}:5000/${link.shortCode}`;
	return /* @__PURE__ */ jsx("div", {
		className: "modal-overlay",
		ref: overlayRef,
		onClick: handleOverlayClick,
		children: /* @__PURE__ */ jsxs("div", {
			className: "modal-content",
			role: "dialog",
			"aria-modal": "true",
			"aria-labelledby": "qr-modal-title",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "modal-header",
				children: [/* @__PURE__ */ jsx("h2", {
					id: "qr-modal-title",
					children: "QR Code"
				}), /* @__PURE__ */ jsx("button", {
					className: "modal-close",
					onClick: onClose,
					"aria-label": "Close dialog",
					children: "×"
				})]
			}), /* @__PURE__ */ jsxs("div", {
				className: "qr-modal-body",
				children: [
					/* @__PURE__ */ jsx("p", {
						className: "qr-short-url",
						children: shortUrl
					}),
					loading && /* @__PURE__ */ jsx("div", {
						className: "qr-preview qr-loading",
						children: /* @__PURE__ */ jsx("div", { className: "qr-skeleton" })
					}),
					error && /* @__PURE__ */ jsx("div", {
						className: "qr-preview",
						children: /* @__PURE__ */ jsx("div", {
							className: "error-msg",
							children: error
						})
					}),
					imageUrl && /* @__PURE__ */ jsx("div", {
						className: "qr-preview",
						children: /* @__PURE__ */ jsx("img", {
							src: imageUrl,
							alt: `QR code for /${link.shortCode}`,
							className: "qr-image"
						})
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "qr-actions",
						children: [/* @__PURE__ */ jsx("button", {
							className: "btn btn-primary",
							onClick: handleDownload,
							disabled: loading || !!error,
							children: "Download PNG"
						}), /* @__PURE__ */ jsx("button", {
							className: "btn btn-outline qr-copy-btn",
							onClick: handleCopyUrl,
							children: "Copy Short URL"
						})]
					})
				]
			})]
		})
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
//#region src/components/LinksTable.jsx
function StatusBadges({ link }) {
	const isExpired = link.expiresAt && new Date(link.expiresAt) < /* @__PURE__ */ new Date();
	const badges = [];
	if (link.isFlagged) badges.push(/* @__PURE__ */ jsx("span", {
		className: "badge badge-flagged",
		children: "⚠ Flagged"
	}, "flag"));
	if (link.hasPassword) badges.push(/* @__PURE__ */ jsx("span", {
		className: "badge badge-protected",
		children: "🔒 Protected"
	}, "pw"));
	if (link.expiresAt) if (isExpired) badges.push(/* @__PURE__ */ jsx("span", {
		className: "badge badge-expired",
		children: "⏰ Expired"
	}, "exp"));
	else badges.push(/* @__PURE__ */ jsx("span", {
		className: "badge badge-expiring",
		children: "⏰ Expiring"
	}, "exp"));
	return badges.length > 0 ? /* @__PURE__ */ jsx("span", {
		className: "badge-group",
		children: badges
	}) : null;
}
function LinksTable({ links, onRefresh, loading, selectedIds, onSelect, onSelectAll }) {
	const [editingLink, setEditingLink] = useState(null);
	const [qrLink, setQrLink] = useState(null);
	const [deletingId, setDeletingId] = useState(null);
	const navigate = useNavigate();
	async function handleDelete(link) {
		if (!window.confirm("Are you sure you want to delete this link?")) return;
		setDeletingId(link.id);
		try {
			await deleteLink(link.id);
			toast.success("Link deleted");
			onRefresh();
		} catch (err) {
			toast.error(err.message);
		} finally {
			setDeletingId(null);
		}
	}
	if (loading) return /* @__PURE__ */ jsx("div", {
		className: "table-skeleton",
		children: [
			1,
			2,
			3,
			4,
			5
		].map((i) => /* @__PURE__ */ jsxs("div", {
			className: "table-skeleton-row",
			children: [
				/* @__PURE__ */ jsx("div", {
					className: "skeleton",
					style: { width: "20%" }
				}),
				/* @__PURE__ */ jsx("div", {
					className: "skeleton",
					style: { width: "35%" }
				}),
				/* @__PURE__ */ jsx("div", {
					className: "skeleton",
					style: { width: "10%" }
				}),
				/* @__PURE__ */ jsx("div", {
					className: "skeleton",
					style: { width: "15%" }
				}),
				/* @__PURE__ */ jsx("div", {
					className: "skeleton",
					style: { width: "20%" }
				})
			]
		}, i))
	});
	if (!links.length) return /* @__PURE__ */ jsxs("div", {
		className: "empty-state",
		children: [
			/* @__PURE__ */ jsx("div", {
				className: "empty-state-icon",
				children: "🔗"
			}),
			/* @__PURE__ */ jsx("h3", { children: "No links found" }),
			/* @__PURE__ */ jsx("p", { children: "Create your first short link above, or adjust your filters." })
		]
	});
	const allSelected = selectedIds && selectedIds.length === links.length && links.length > 0;
	const someSelected = selectedIds && selectedIds.length > 0 && selectedIds.length < links.length;
	return /* @__PURE__ */ jsxs("div", {
		className: "links-table-wrap",
		children: [
			/* @__PURE__ */ jsxs("table", {
				className: "links-table",
				children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
					selectedIds !== void 0 && /* @__PURE__ */ jsx("th", {
						className: "links-table-th-check",
						children: /* @__PURE__ */ jsx("input", {
							type: "checkbox",
							checked: allSelected,
							ref: (el) => {
								if (el) el.indeterminate = someSelected;
							},
							onChange: onSelectAll,
							"aria-label": "Select all links"
						})
					}),
					/* @__PURE__ */ jsx("th", { children: "Short URL" }),
					/* @__PURE__ */ jsx("th", { children: "Original URL" }),
					/* @__PURE__ */ jsx("th", { children: "Clicks" }),
					/* @__PURE__ */ jsx("th", { children: "Health" }),
					/* @__PURE__ */ jsx("th", { children: "Created" }),
					/* @__PURE__ */ jsx("th", { children: "Actions" })
				] }) }), /* @__PURE__ */ jsx("tbody", { children: links.map((link) => /* @__PURE__ */ jsxs("tr", {
					className: selectedIds?.includes(link.id) ? "row-selected" : "",
					children: [
						selectedIds !== void 0 && /* @__PURE__ */ jsx("td", {
							className: "links-table-td-check",
							children: /* @__PURE__ */ jsx("input", {
								type: "checkbox",
								checked: selectedIds.includes(link.id),
								onChange: () => onSelect(link.id),
								"aria-label": `Select link ${link.shortCode}`
							})
						}),
						/* @__PURE__ */ jsxs("td", { children: [/* @__PURE__ */ jsxs("a", {
							href: `${window.location.protocol}//${window.location.hostname}:5000/${link.shortCode}`,
							target: "_blank",
							rel: "noopener noreferrer",
							className: "short-link",
							"aria-label": `Open short link /${link.shortCode} in new tab`,
							children: ["/", link.shortCode]
						}), /* @__PURE__ */ jsx(StatusBadges, { link })] }),
						/* @__PURE__ */ jsx("td", {
							className: "original-url",
							title: link.originalUrl,
							children: link.originalUrl
						}),
						/* @__PURE__ */ jsx("td", { children: link._count?.clicks ?? link.clickCount ?? 0 }),
						/* @__PURE__ */ jsx("td", { children: link.healthScore !== void 0 ? /* @__PURE__ */ jsxs("span", {
							className: "health-cell",
							children: [/* @__PURE__ */ jsx("span", {
								className: "health-emoji",
								children: healthMeta(link.healthLabel).emoji
							}), /* @__PURE__ */ jsx("span", {
								className: "health-cell-score",
								children: link.healthScore
							})]
						}) : /* @__PURE__ */ jsx("span", {
							className: "health-cell-muted",
							children: "—"
						}) }),
						/* @__PURE__ */ jsx("td", { children: new Date(link.createdAt).toLocaleDateString() }),
						/* @__PURE__ */ jsxs("td", {
							className: "actions-cell",
							children: [
								/* @__PURE__ */ jsx("button", {
									className: "btn btn-sm btn-qr",
									onClick: () => setQrLink(link),
									disabled: deletingId === link.id,
									"aria-label": `Show QR code for /${link.shortCode}`,
									children: "QR"
								}),
								/* @__PURE__ */ jsx("button", {
									className: "btn btn-sm btn-analytics",
									onClick: () => navigate(`/analytics/${link.id}`, { state: link }),
									disabled: deletingId === link.id,
									"aria-label": `View analytics for /${link.shortCode}`,
									children: "Analytics"
								}),
								/* @__PURE__ */ jsx("button", {
									className: "btn btn-sm btn-edit",
									onClick: () => setEditingLink(link),
									disabled: deletingId === link.id,
									"aria-label": `Edit /${link.shortCode}`,
									children: "Edit"
								}),
								/* @__PURE__ */ jsx("button", {
									className: "btn btn-sm btn-delete",
									onClick: () => handleDelete(link),
									disabled: deletingId === link.id,
									"aria-label": `Delete /${link.shortCode}`,
									children: deletingId === link.id ? "..." : "Delete"
								})
							]
						})
					]
				}, link.id)) })]
			}),
			editingLink && /* @__PURE__ */ jsx(EditLinkModal, {
				link: editingLink,
				onClose: () => setEditingLink(null),
				onSaved: onRefresh
			}),
			qrLink && /* @__PURE__ */ jsx(QRCodeModal, {
				link: qrLink,
				onClose: () => setQrLink(null)
			})
		]
	});
}
//#endregion
//#region src/components/SearchFilter.jsx
function SearchFilter({ search, status, sort, onSearchChange, onStatusChange, onSortChange }) {
	return /* @__PURE__ */ jsx("div", {
		className: "search-filter",
		children: /* @__PURE__ */ jsxs("div", {
			className: "search-filter-row",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "search-input-wrap",
				children: [
					/* @__PURE__ */ jsxs("svg", {
						className: "search-icon",
						width: "16",
						height: "16",
						viewBox: "0 0 24 24",
						fill: "none",
						stroke: "currentColor",
						strokeWidth: "2",
						strokeLinecap: "round",
						strokeLinejoin: "round",
						children: [/* @__PURE__ */ jsx("circle", {
							cx: "11",
							cy: "11",
							r: "8"
						}), /* @__PURE__ */ jsx("line", {
							x1: "21",
							y1: "21",
							x2: "16.65",
							y2: "16.65"
						})]
					}),
					/* @__PURE__ */ jsx("input", {
						type: "text",
						placeholder: "Search by URL, short code, or title...",
						value: search,
						onChange: (e) => onSearchChange(e.target.value),
						className: "input search-input",
						"aria-label": "Search links"
					}),
					search && /* @__PURE__ */ jsx("button", {
						className: "search-clear",
						onClick: () => onSearchChange(""),
						type: "button",
						"aria-label": "Clear search",
						children: "×"
					})
				]
			}), /* @__PURE__ */ jsxs("div", {
				className: "filter-group",
				children: [/* @__PURE__ */ jsxs("select", {
					value: status,
					onChange: (e) => onStatusChange(e.target.value),
					className: "input filter-select",
					"aria-label": "Filter by status",
					children: [
						/* @__PURE__ */ jsx("option", {
							value: "",
							children: "All Status"
						}),
						/* @__PURE__ */ jsx("option", {
							value: "active",
							children: "Active"
						}),
						/* @__PURE__ */ jsx("option", {
							value: "inactive",
							children: "Inactive"
						}),
						/* @__PURE__ */ jsx("option", {
							value: "protected",
							children: "Protected"
						}),
						/* @__PURE__ */ jsx("option", {
							value: "public",
							children: "Public"
						}),
						/* @__PURE__ */ jsx("option", {
							value: "expired",
							children: "Expired"
						})
					]
				}), /* @__PURE__ */ jsxs("select", {
					value: sort,
					onChange: (e) => onSortChange(e.target.value),
					className: "input filter-select",
					"aria-label": "Sort links",
					children: [
						/* @__PURE__ */ jsx("option", {
							value: "newest",
							children: "Newest First"
						}),
						/* @__PURE__ */ jsx("option", {
							value: "oldest",
							children: "Oldest First"
						}),
						/* @__PURE__ */ jsx("option", {
							value: "most_clicked",
							children: "Most Clicked"
						}),
						/* @__PURE__ */ jsx("option", {
							value: "least_clicked",
							children: "Least Clicked"
						})
					]
				})]
			})]
		})
	});
}
//#endregion
//#region src/components/Pagination.jsx
function Pagination({ page, totalPages, onPageChange }) {
	if (totalPages <= 1) return null;
	const pages = [];
	const maxVisible = 5;
	let start = Math.max(1, page - Math.floor(maxVisible / 2));
	let end = Math.min(totalPages, start + maxVisible - 1);
	if (end - start < 4) start = Math.max(1, end - maxVisible + 1);
	for (let i = start; i <= end; i++) pages.push(i);
	return /* @__PURE__ */ jsxs("div", {
		className: "pagination",
		role: "navigation",
		"aria-label": "Pagination",
		children: [
			/* @__PURE__ */ jsx("button", {
				className: "btn btn-sm btn-page",
				disabled: page <= 1,
				onClick: () => onPageChange(page - 1),
				"aria-label": "Previous page",
				children: "Prev"
			}),
			start > 1 && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("button", {
				className: "btn btn-sm btn-page",
				onClick: () => onPageChange(1),
				"aria-label": "Go to page 1",
				children: "1"
			}), start > 2 && /* @__PURE__ */ jsx("span", {
				className: "pagination-ellipsis",
				children: "..."
			})] }),
			pages.map((p) => /* @__PURE__ */ jsx("button", {
				className: `btn btn-sm btn-page ${p === page ? "btn-page-active" : ""}`,
				onClick: () => onPageChange(p),
				"aria-label": `Go to page ${p}`,
				"aria-current": p === page ? "page" : void 0,
				children: p
			}, p)),
			end < totalPages && /* @__PURE__ */ jsxs(Fragment, { children: [end < totalPages - 1 && /* @__PURE__ */ jsx("span", {
				className: "pagination-ellipsis",
				children: "..."
			}), /* @__PURE__ */ jsx("button", {
				className: "btn btn-sm btn-page",
				onClick: () => onPageChange(totalPages),
				"aria-label": `Go to page ${totalPages}`,
				children: totalPages
			})] }),
			/* @__PURE__ */ jsx("button", {
				className: "btn btn-sm btn-page",
				disabled: page >= totalPages,
				onClick: () => onPageChange(page + 1),
				"aria-label": "Next page",
				children: "Next"
			})
		]
	});
}
//#endregion
//#region src/components/ConfirmDialog.jsx
function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel, onConfirm, onCancel, danger }) {
	const cancelRef = useRef(null);
	useEffect(() => {
		if (open && cancelRef.current) cancelRef.current.focus();
	}, [open]);
	useEffect(() => {
		if (!open) return;
		function handleKey(e) {
			if (e.key === "Escape") onCancel();
		}
		document.addEventListener("keydown", handleKey);
		return () => document.removeEventListener("keydown", handleKey);
	}, [open, onCancel]);
	if (!open) return null;
	return /* @__PURE__ */ jsx("div", {
		className: "modal-overlay",
		onClick: onCancel,
		children: /* @__PURE__ */ jsxs("div", {
			className: "modal-content confirm-dialog",
			onClick: (e) => e.stopPropagation(),
			role: "dialog",
			"aria-modal": "true",
			"aria-label": title,
			children: [/* @__PURE__ */ jsxs("div", {
				className: "confirm-dialog-body",
				children: [/* @__PURE__ */ jsx("h3", {
					className: "confirm-dialog-title",
					children: title
				}), /* @__PURE__ */ jsx("p", {
					className: "confirm-dialog-message",
					children: message
				})]
			}), /* @__PURE__ */ jsxs("div", {
				className: "modal-actions",
				children: [/* @__PURE__ */ jsx("button", {
					ref: cancelRef,
					className: "btn btn-cancel",
					onClick: onCancel,
					children: cancelLabel || "Cancel"
				}), /* @__PURE__ */ jsx("button", {
					className: `btn ${danger ? "btn-danger" : "btn-primary"}`,
					onClick: onConfirm,
					children: confirmLabel || "Confirm"
				})]
			})]
		})
	});
}
//#endregion
//#region src/pages/Dashboard.jsx
function Dashboard() {
	const [links, setLinks] = useState([]);
	const [loading, setLoading] = useState(true);
	const [pagination, setPagination] = useState(null);
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState("");
	const [sort, setSort] = useState("newest");
	const [page, setPage] = useState(1);
	const [selectedIds, setSelectedIds] = useState([]);
	const [confirmDialog, setConfirmDialog] = useState(null);
	const fetchLinks = useCallback(async () => {
		setLoading(true);
		try {
			const params = {
				page,
				limit: 15
			};
			if (search) params.search = search;
			if (status) params.status = status;
			if (sort) params.sort = sort;
			const data = await getLinks(params);
			setLinks(data.data || []);
			setPagination(data.pagination || null);
		} catch (err) {
			toast.error(err.message);
		} finally {
			setLoading(false);
		}
	}, [
		page,
		search,
		status,
		sort
	]);
	useEffect(() => {
		fetchLinks();
	}, [fetchLinks]);
	useEffect(() => {
		setPage(1);
	}, [
		search,
		status,
		sort
	]);
	useEffect(() => {
		setSelectedIds([]);
	}, [links]);
	function handleSearchChange(value) {
		setSearch(value);
	}
	function handleStatusChange(value) {
		setStatus(value);
	}
	function handleSortChange(value) {
		setSort(value);
	}
	function handleSelect(id) {
		setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
	}
	function handleSelectAll() {
		if (selectedIds.length === links.length) setSelectedIds([]);
		else setSelectedIds(links.map((l) => l.id));
	}
	function handleBulkAction(action) {
		if (selectedIds.length === 0) {
			toast.error("No links selected");
			return;
		}
		const messages = {
			delete: {
				title: "Delete Links",
				message: `Are you sure you want to delete ${selectedIds.length} link(s)? This action cannot be undone.`,
				confirmLabel: "Delete",
				danger: true,
				action: async () => {
					try {
						await bulkDelete(selectedIds);
						toast.success(`${selectedIds.length} links deleted`);
						setSelectedIds([]);
						fetchLinks();
					} catch (err) {
						toast.error(err.message);
					}
				}
			},
			activate: {
				title: "Activate Links",
				message: `Activate ${selectedIds.length} link(s)?`,
				confirmLabel: "Activate",
				danger: false,
				action: async () => {
					try {
						await bulkActivate(selectedIds);
						toast.success(`${selectedIds.length} links activated`);
						setSelectedIds([]);
						fetchLinks();
					} catch (err) {
						toast.error(err.message);
					}
				}
			},
			deactivate: {
				title: "Deactivate Links",
				message: `Deactivate ${selectedIds.length} link(s)?`,
				confirmLabel: "Deactivate",
				danger: false,
				action: async () => {
					try {
						await bulkDeactivate(selectedIds);
						toast.success(`${selectedIds.length} links deactivated`);
						setSelectedIds([]);
						fetchLinks();
					} catch (err) {
						toast.error(err.message);
					}
				}
			}
		};
		setConfirmDialog(messages[action]);
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "dashboard",
		children: [
			/* @__PURE__ */ jsx(DashboardStats, {}),
			/* @__PURE__ */ jsxs("div", {
				className: "dashboard-row",
				children: [/* @__PURE__ */ jsx(CreateLinkForm, { onCreated: fetchLinks }), /* @__PURE__ */ jsx(TopLinks, {})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "dashboard-links-section",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "dashboard-links-header",
						children: [/* @__PURE__ */ jsx("h2", {
							className: "dashboard-links-title",
							children: "Your Links"
						}), /* @__PURE__ */ jsx(Link, {
							to: "/bulk",
							className: "btn btn-sm btn-primary",
							children: "Bulk Management"
						})]
					}),
					/* @__PURE__ */ jsx(SearchFilter, {
						search,
						status,
						sort,
						onSearchChange: handleSearchChange,
						onStatusChange: handleStatusChange,
						onSortChange: handleSortChange
					}),
					selectedIds.length > 0 && /* @__PURE__ */ jsxs("div", {
						className: "bulk-actions-bar",
						children: [/* @__PURE__ */ jsxs("span", {
							className: "bulk-selected-count",
							children: [selectedIds.length, " selected"]
						}), /* @__PURE__ */ jsxs("div", {
							className: "bulk-actions-buttons",
							children: [
								/* @__PURE__ */ jsx("button", {
									className: "btn btn-sm btn-primary",
									onClick: () => handleBulkAction("activate"),
									children: "Activate"
								}),
								/* @__PURE__ */ jsx("button", {
									className: "btn btn-sm btn-page",
									onClick: () => handleBulkAction("deactivate"),
									children: "Deactivate"
								}),
								/* @__PURE__ */ jsx("button", {
									className: "btn btn-sm btn-delete",
									onClick: () => handleBulkAction("delete"),
									children: "Delete"
								}),
								/* @__PURE__ */ jsx("button", {
									className: "btn btn-sm btn-cancel",
									onClick: () => setSelectedIds([]),
									children: "Clear"
								})
							]
						})]
					}),
					/* @__PURE__ */ jsx(LinksTable, {
						links,
						onRefresh: fetchLinks,
						loading,
						selectedIds,
						onSelect: handleSelect,
						onSelectAll: handleSelectAll
					}),
					pagination && /* @__PURE__ */ jsx(Pagination, {
						page: pagination.page,
						totalPages: pagination.totalPages,
						onPageChange: setPage
					})
				]
			}),
			/* @__PURE__ */ jsx(ConfirmDialog, {
				open: !!confirmDialog,
				title: confirmDialog?.title || "",
				message: confirmDialog?.message || "",
				confirmLabel: confirmDialog?.confirmLabel,
				danger: confirmDialog?.danger,
				onConfirm: () => {
					confirmDialog?.action();
					setConfirmDialog(null);
				},
				onCancel: () => setConfirmDialog(null)
			})
		]
	});
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
//#region src/pages/BulkManagement.jsx
function BulkManagement() {
	const [mode, setMode] = useState("");
	const [dragOver, setDragOver] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [result, setResult] = useState(null);
	const [bulkText, setBulkText] = useState("");
	const [uploadProgress, setUploadProgress] = useState("");
	const fileInputRef = useRef(null);
	const handleDrop = useCallback((e) => {
		e.preventDefault();
		setDragOver(false);
		const file = e.dataTransfer.files[0];
		if (file && file.name.endsWith(".csv")) {
			setUploading(true);
			setResult(null);
			setUploadProgress("Uploading file...");
			csvUpload(file).then((data) => {
				setResult(data);
				if (data.totalFailed > 0) toast.success(`Imported ${data.totalCreated} links, ${data.totalFailed} failed`);
				else toast.success(`Successfully imported ${data.totalCreated} links`);
			}).catch((err) => {
				toast.error(err.message);
			}).finally(() => {
				setUploading(false);
				setUploadProgress("");
			});
		} else toast.error("Please upload a CSV file");
	}, []);
	const handleDragOver = useCallback((e) => {
		e.preventDefault();
		setDragOver(true);
	}, []);
	const handleDragLeave = useCallback(() => {
		setDragOver(false);
	}, []);
	async function handleFileUpload(file) {
		setUploading(true);
		setResult(null);
		setUploadProgress("Uploading file...");
		try {
			setUploadProgress("Processing CSV...");
			const data = await csvUpload(file);
			setResult(data);
			if (data.totalFailed > 0) toast.success(`Imported ${data.totalCreated} links, ${data.totalFailed} failed`);
			else toast.success(`Successfully imported ${data.totalCreated} links`);
		} catch (err) {
			toast.error(err.message);
		} finally {
			setUploading(false);
			setUploadProgress("");
		}
	}
	function handleFileChange(e) {
		const file = e.target.files[0];
		if (file) handleFileUpload(file);
		e.target.value = "";
	}
	async function handleBulkCreate() {
		const urls = bulkText.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
		if (urls.length === 0) {
			toast.error("Please enter at least one URL");
			return;
		}
		if (urls.length > 50) {
			toast.error("Maximum 50 URLs per bulk create");
			return;
		}
		const links = urls.map((url) => ({ originalUrl: url }));
		setUploading(true);
		setResult(null);
		try {
			const data = await bulkCreateLinks(links);
			setResult(data);
			if (data.totalFailed > 0) toast.success(`Created ${data.totalCreated} links, ${data.totalFailed} failed`);
			else toast.success(`Successfully created ${data.totalCreated} links`);
			setBulkText("");
		} catch (err) {
			toast.error(err.message);
		} finally {
			setUploading(false);
		}
	}
	async function handleExport() {
		try {
			const blob = await exportCSV();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "linkpulse-export.csv";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			toast.success("CSV exported successfully");
		} catch (err) {
			toast.error(err.message);
		}
	}
	function downloadFailedCSV() {
		if (!result || !result.failed || result.failed.length === 0) return;
		const csv = "Row,URL,Error\n" + result.failed.map((f) => `Row ${f.row},"${f.originalUrl}","${f.error}"`).join("\n");
		const blob = new Blob([csv], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "linkpulse-failed.csv";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "bulk-page",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "bulk-header",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
					className: "bulk-title",
					children: "Bulk Management"
				}), /* @__PURE__ */ jsx("p", {
					className: "bulk-subtitle",
					children: "Import, create, and export links in bulk"
				})] }), /* @__PURE__ */ jsx(Link, {
					to: "/dashboard",
					className: "btn btn-page",
					children: "← Back to Dashboard"
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "bulk-actions-grid",
				children: [
					/* @__PURE__ */ jsxs("button", {
						className: `bulk-action-card ${mode === "csv" ? "bulk-action-active" : ""}`,
						onClick: () => {
							setMode("csv");
							setResult(null);
						},
						children: [
							/* @__PURE__ */ jsx("div", {
								className: "bulk-action-icon",
								children: "📎"
							}),
							/* @__PURE__ */ jsx("h3", { children: "CSV Upload" }),
							/* @__PURE__ */ jsx("p", { children: "Upload a CSV file with URLs to create multiple links at once" })
						]
					}),
					/* @__PURE__ */ jsxs("button", {
						className: `bulk-action-card ${mode === "text" ? "bulk-action-active" : ""}`,
						onClick: () => {
							setMode("text");
							setResult(null);
						},
						children: [
							/* @__PURE__ */ jsx("div", {
								className: "bulk-action-icon",
								children: "📝"
							}),
							/* @__PURE__ */ jsx("h3", { children: "Bulk Create" }),
							/* @__PURE__ */ jsx("p", { children: "Paste multiple URLs, one per line, to create short links" })
						]
					}),
					/* @__PURE__ */ jsxs("button", {
						className: "bulk-action-card",
						onClick: handleExport,
						children: [
							/* @__PURE__ */ jsx("div", {
								className: "bulk-action-icon",
								children: "💾"
							}),
							/* @__PURE__ */ jsx("h3", { children: "Export CSV" }),
							/* @__PURE__ */ jsx("p", { children: "Download all your links as a CSV file for backup or analysis" })
						]
					})
				]
			}),
			mode === "csv" && /* @__PURE__ */ jsxs("div", {
				className: "bulk-section",
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "bulk-section-title",
						children: "Upload CSV File"
					}),
					/* @__PURE__ */ jsxs("p", {
						className: "bulk-section-desc",
						children: [
							"CSV must have a column named ",
							/* @__PURE__ */ jsx("code", { children: "url" }),
							", ",
							/* @__PURE__ */ jsx("code", { children: "originalUrl" }),
							", or ",
							/* @__PURE__ */ jsx("code", { children: "original_url" }),
							". Optional columns: ",
							/* @__PURE__ */ jsx("code", { children: "title" }),
							", ",
							/* @__PURE__ */ jsx("code", { children: "password" }),
							", ",
							/* @__PURE__ */ jsx("code", { children: "expiresAt" }),
							"."
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: `csv-dropzone ${dragOver ? "csv-dropzone-active" : ""}`,
						onDrop: handleDrop,
						onDragOver: handleDragOver,
						onDragLeave: handleDragLeave,
						onClick: () => fileInputRef.current?.click(),
						onKeyDown: (e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								fileInputRef.current?.click();
							}
						},
						role: "button",
						tabIndex: 0,
						"aria-label": "Upload CSV file. Drag and drop or press Enter to browse.",
						children: [/* @__PURE__ */ jsx("input", {
							ref: fileInputRef,
							type: "file",
							accept: ".csv",
							onChange: handleFileChange,
							style: { display: "none" }
						}), uploading ? /* @__PURE__ */ jsxs("div", {
							className: "csv-dropzone-loading",
							children: [/* @__PURE__ */ jsx("div", { className: "spinner" }), /* @__PURE__ */ jsx("p", { children: uploadProgress })]
						}) : /* @__PURE__ */ jsxs(Fragment, { children: [
							/* @__PURE__ */ jsx("div", {
								className: "csv-dropzone-icon",
								children: "📤"
							}),
							/* @__PURE__ */ jsx("p", {
								className: "csv-dropzone-text",
								children: "Drag and drop a CSV file here, or click to browse"
							}),
							/* @__PURE__ */ jsx("p", {
								className: "csv-dropzone-hint",
								children: "Maximum 100 rows, 5MB file size limit"
							})
						] })]
					})
				]
			}),
			mode === "text" && /* @__PURE__ */ jsxs("div", {
				className: "bulk-section",
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "bulk-section-title",
						children: "Bulk Create from Text"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "bulk-section-desc",
						children: "Enter one URL per line. Maximum 50 URLs at a time."
					}),
					/* @__PURE__ */ jsx("textarea", {
						className: "input bulk-textarea",
						placeholder: "https://example.com/page-1\nhttps://example.com/page-2\nhttps://example.com/page-3",
						value: bulkText,
						onChange: (e) => setBulkText(e.target.value),
						rows: 8,
						disabled: uploading
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "bulk-text-actions",
						children: [/* @__PURE__ */ jsxs("span", {
							className: "bulk-text-count",
							children: [bulkText.split("\n").filter((l) => l.trim()).length, " URLs"]
						}), /* @__PURE__ */ jsx("button", {
							className: "btn btn-primary",
							onClick: handleBulkCreate,
							disabled: uploading || !bulkText.trim(),
							children: uploading ? "Creating..." : "Create Links"
						})]
					})
				]
			}),
			result && /* @__PURE__ */ jsxs("div", {
				className: "bulk-section bulk-result",
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "bulk-section-title",
						children: "Results"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "bulk-result-summary",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "bulk-result-stat bulk-result-success",
							children: [/* @__PURE__ */ jsx("span", {
								className: "bulk-result-number",
								children: result.totalCreated
							}), /* @__PURE__ */ jsx("span", {
								className: "bulk-result-label",
								children: "Created"
							})]
						}), /* @__PURE__ */ jsxs("div", {
							className: "bulk-result-stat bulk-result-fail",
							children: [/* @__PURE__ */ jsx("span", {
								className: "bulk-result-number",
								children: result.totalFailed
							}), /* @__PURE__ */ jsx("span", {
								className: "bulk-result-label",
								children: "Failed"
							})]
						})]
					}),
					result.created && result.created.length > 0 && /* @__PURE__ */ jsxs("div", {
						className: "bulk-result-table-wrap",
						children: [/* @__PURE__ */ jsx("h3", {
							className: "bulk-result-subtitle",
							children: "Created Links"
						}), /* @__PURE__ */ jsxs("table", {
							className: "links-table bulk-result-table",
							children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
								/* @__PURE__ */ jsx("th", { children: "Short Code" }),
								/* @__PURE__ */ jsx("th", { children: "Original URL" }),
								/* @__PURE__ */ jsx("th", { children: "Title" })
							] }) }), /* @__PURE__ */ jsx("tbody", { children: result.created.map((link) => /* @__PURE__ */ jsxs("tr", { children: [
								/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsxs("span", {
									className: "short-link",
									children: ["/", link.shortCode]
								}) }),
								/* @__PURE__ */ jsx("td", {
									className: "original-url",
									title: link.originalUrl,
									children: link.originalUrl
								}),
								/* @__PURE__ */ jsx("td", { children: link.title || "-" })
							] }, link.id)) })]
						})]
					}),
					result.failed && result.failed.length > 0 && /* @__PURE__ */ jsxs("div", {
						className: "bulk-result-table-wrap",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "bulk-result-subtitle-row",
							children: [/* @__PURE__ */ jsx("h3", {
								className: "bulk-result-subtitle",
								children: "Failed Rows"
							}), /* @__PURE__ */ jsx("button", {
								className: "btn btn-sm btn-edit",
								onClick: downloadFailedCSV,
								children: "Download Failed CSV"
							})]
						}), /* @__PURE__ */ jsxs("table", {
							className: "links-table bulk-result-table",
							children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
								/* @__PURE__ */ jsx("th", { children: "Row" }),
								/* @__PURE__ */ jsx("th", { children: "URL" }),
								/* @__PURE__ */ jsx("th", { children: "Error" })
							] }) }), /* @__PURE__ */ jsx("tbody", { children: result.failed.map((f, i) => /* @__PURE__ */ jsxs("tr", { children: [
								/* @__PURE__ */ jsx("td", { children: f.row }),
								/* @__PURE__ */ jsx("td", {
									className: "original-url",
									title: f.originalUrl,
									children: f.originalUrl
								}),
								/* @__PURE__ */ jsx("td", {
									className: "bulk-error-text",
									children: f.error
								})
							] }, i)) })]
						})]
					})
				]
			})
		]
	});
}
//#endregion
//#region src/pages/PasswordGate.jsx
function PasswordGate() {
	const { id } = useParams();
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const shortCode = searchParams.get("shortCode") || "";
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	async function handleSubmit(e) {
		e.preventDefault();
		setLoading(true);
		try {
			const result = await verifyPassword(id, password);
			toast.success("Access granted");
			window.location.href = result.redirectUrl;
		} catch (err) {
			toast.error(err.message);
		} finally {
			setLoading(false);
		}
	}
	return /* @__PURE__ */ jsx("div", {
		className: "gate-page",
		children: /* @__PURE__ */ jsxs("div", {
			className: "gate-card",
			children: [
				/* @__PURE__ */ jsx("div", {
					className: "gate-icon",
					children: "🔒"
				}),
				/* @__PURE__ */ jsx("h2", { children: "This link is password-protected" }),
				shortCode && /* @__PURE__ */ jsxs("p", {
					className: "gate-shortcode",
					children: ["/", shortCode]
				}),
				/* @__PURE__ */ jsxs("form", {
					onSubmit: handleSubmit,
					className: "gate-form",
					children: [/* @__PURE__ */ jsx("input", {
						type: "password",
						placeholder: "Enter password",
						value: password,
						onChange: (e) => setPassword(e.target.value),
						required: true,
						className: "input",
						autoFocus: true,
						"aria-label": "Link password"
					}), /* @__PURE__ */ jsx("button", {
						type: "submit",
						className: "btn btn-primary btn-block",
						disabled: loading,
						children: loading ? "Verifying..." : "Continue"
					})]
				}),
				/* @__PURE__ */ jsx("button", {
					className: "btn btn-back gate-back",
					onClick: () => navigate("/login"),
					children: "← Back to Login"
				})
			]
		})
	});
}
//#endregion
//#region src/App.jsx
function ProtectedRoute({ children }) {
	const { token, loading } = useAuth();
	if (loading) return null;
	return token ? children : /* @__PURE__ */ jsx(Navigate, {
		to: "/login",
		replace: true
	});
}
function GuestRoute({ children }) {
	const { token, loading } = useAuth();
	if (loading) return null;
	return token ? /* @__PURE__ */ jsx(Navigate, {
		to: "/dashboard",
		replace: true
	}) : children;
}
function App() {
	return /* @__PURE__ */ jsx(BrowserRouter, { children: /* @__PURE__ */ jsxs("div", {
		className: "app",
		children: [/* @__PURE__ */ jsx(Navbar, {}), /* @__PURE__ */ jsx("main", {
			className: "main-content",
			children: /* @__PURE__ */ jsxs(Routes, { children: [
				/* @__PURE__ */ jsx(Route, {
					path: "/",
					element: /* @__PURE__ */ jsx(Navigate, {
						to: "/dashboard",
						replace: true
					})
				}),
				/* @__PURE__ */ jsx(Route, {
					path: "/login",
					element: /* @__PURE__ */ jsx(GuestRoute, { children: /* @__PURE__ */ jsx(Login, {}) })
				}),
				/* @__PURE__ */ jsx(Route, {
					path: "/register",
					element: /* @__PURE__ */ jsx(GuestRoute, { children: /* @__PURE__ */ jsx(Register, {}) })
				}),
				/* @__PURE__ */ jsx(Route, {
					path: "/dashboard",
					element: /* @__PURE__ */ jsx(ProtectedRoute, { children: /* @__PURE__ */ jsx(Dashboard, {}) })
				}),
				/* @__PURE__ */ jsx(Route, {
					path: "/analytics/:id",
					element: /* @__PURE__ */ jsx(ProtectedRoute, { children: /* @__PURE__ */ jsx(Analytics, {}) })
				}),
				/* @__PURE__ */ jsx(Route, {
					path: "/bulk",
					element: /* @__PURE__ */ jsx(ProtectedRoute, { children: /* @__PURE__ */ jsx(BulkManagement, {}) })
				}),
				/* @__PURE__ */ jsx(Route, {
					path: "/password-gate/:id",
					element: /* @__PURE__ */ jsx(PasswordGate, {})
				})
			] })
		})]
	}) });
}
//#endregion
//#region ssr-multiperiod-harness.jsx
var dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", { url: "http://localhost/analytics/11111111-1111-1111-1111-111111111111" });
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
			width: 1280,
			height: 800
		} }], this);
	}
	unobserve() {}
	disconnect() {}
};
localStorage.setItem("token", "fake-token");
localStorage.setItem("user", JSON.stringify({
	id: "u1",
	name: "Test User",
	email: "t@t.com"
}));
var payloadDir = "C:/Users/tponv/AppData/Local/Temp/opencode/payloads-multi";
var files = fs.readdirSync(payloadDir).filter((f) => f.endsWith(".json"));
var payloadIdx = 0;
globalThis.fetch = async () => ({
	ok: true,
	status: 200,
	text: async () => JSON.stringify(JSON.parse(fs.readFileSync(path.join(payloadDir, files[payloadIdx]), "utf8")))
});
process.on("uncaughtException", (err) => {
	console.log(`=== UNCAUGHT EXCEPTION on ${files[payloadIdx]} ===`);
	console.log(err && err.stack ? err.stack : err);
	process.exit(1);
});
process.on("unhandledRejection", (err) => {
	console.log(`=== UNHANDLED REJECTION on ${files[payloadIdx]} ===`);
	console.log(err && err.stack ? err.stack : err);
	process.exit(1);
});
var root;
function runNext(index) {
	if (index >= files.length) {
		console.log("ALL DONE — no crashes across all payloads");
		process.exit(0);
	}
	payloadIdx = index;
	const rootEl = document.createElement("div");
	rootEl.id = "root-" + index;
	document.body.appendChild(rootEl);
	try {
		if (root) root.unmount();
		root = createRoot(rootEl);
		root.render(/* @__PURE__ */ jsxs(StrictMode, { children: [/* @__PURE__ */ jsx(Toaster, {
			position: "top-right",
			toastOptions: { duration: 4e3 }
		}), /* @__PURE__ */ jsx(AuthProvider, { children: /* @__PURE__ */ jsx(App, {}) })] }));
	} catch (err) {
		console.log(`=== CRASH on ${files[index]} ===`);
		console.log(err && err.stack ? err.stack : err);
		process.exit(1);
	}
	setTimeout(() => {
		const html = rootEl.innerHTML;
		if (html.includes("analytics-page") && html.includes("analytics-card")) {
			console.log(`OK ${files[index]} length=${html.length}`);
			runNext(index + 1);
		} else {
			console.log(`=== BLANK on ${files[index]} ===`);
			console.log("html length", html.length);
			process.exit(1);
		}
	}, 300);
}
runNext(0);
//#endregion
export {};
