(()=>{"use strict";module.exports = [
"[project]/src/components/my-day.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MyDay",
    ()=>MyDay
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lunar$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/lunar.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
// ─── Storage ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = "myday.v1";
function todayStr(now = new Date()) {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
function prevDay(key) {
    const [y, m, d] = key.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - 1);
    return todayStr(date);
}
function nextDay(key) {
    const [y, m, d] = key.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 1);
    return todayStr(date);
}
function uid() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function loadData() {
    if ("TURBOPACK compile-time truthy", 1) return {
        v: 1,
        todos: {}
    };
    //TURBOPACK unreachable
    ;
}
function saveData(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch  {}
}
// ─── Auto carry-forward ───────────────────────────────────────────────────────
function carryForward(data, today) {
    let result = data;
    // Look back up to 60 days
    let cur = prevDay(today);
    const limit = (()=>{
        const [y, m, d] = today.split("-").map(Number);
        const t = new Date(y, m - 1, d);
        t.setDate(t.getDate() - 60);
        return todayStr(t);
    })();
    const days = [];
    while(cur >= limit){
        days.unshift(cur);
        cur = prevDay(cur);
    }
    for (const day of days){
        const nxt = nextDay(day);
        if (nxt > today) break;
        const dayItems = result.todos[day] ?? [];
        const undone = dayItems.filter((item)=>!item.done && item.text.trim());
        if (undone.length === 0) continue;
        const nxtItems = result.todos[nxt] ?? [];
        const present = new Set(nxtItems.map((i)=>i.sourceId ?? i.id));
        const toCarry = undone.filter((i)=>!present.has(i.sourceId ?? i.id));
        if (toCarry.length === 0) continue;
        const carried = toCarry.map((i)=>({
                id: uid(),
                text: i.text,
                done: false,
                sourceId: i.sourceId ?? i.id,
                date: nxt
            }));
        result = {
            ...result,
            todos: {
                ...result.todos,
                [nxt]: [
                    ...nxtItems,
                    ...carried
                ]
            }
        };
    }
    return result;
}
// ─── Helpers ─────────────────────────────────────────────────────────────────
const WEEKDAYS = [
    "日",
    "一",
    "二",
    "三",
    "四",
    "五",
    "六"
];
function formatDate(now) {
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    const w = WEEKDAYS[now.getDay()] ?? "";
    return `${y}年${m}月${d}日  週${w}`;
}
// ─── Celebration ─────────────────────────────────────────────────────────────
const DOTS = [
    {
        l: "5%",
        t: "15%",
        c: "#f97316",
        delay: 0
    },
    {
        l: "78%",
        t: "10%",
        c: "#8b5cf6",
        delay: 60
    },
    {
        l: "88%",
        t: "58%",
        c: "#06b6d4",
        delay: 90
    },
    {
        l: "3%",
        t: "68%",
        c: "#f43f5e",
        delay: 30
    },
    {
        l: "45%",
        t: "4%",
        c: "#10b981",
        delay: 55
    },
    {
        l: "90%",
        t: "82%",
        c: "#eab308",
        delay: 20
    },
    {
        l: "14%",
        t: "86%",
        c: "#3b82f6",
        delay: 80
    },
    {
        l: "52%",
        t: "92%",
        c: "#f97316",
        delay: 45
    },
    {
        l: "30%",
        t: "5%",
        c: "#ec4899",
        delay: 70
    },
    {
        l: "70%",
        t: "30%",
        c: "#14b8a6",
        delay: 10
    }
];
function Celebration({ onDone }) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const t = window.setTimeout(onDone, 1300);
        return ()=>window.clearTimeout(t);
    }, [
        onDone
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "pointer-events-none fixed inset-0 z-50 flex items-center justify-center",
        "aria-live": "polite",
        "aria-label": "完成！",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "relative size-32",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "absolute inset-0 m-auto size-16 rounded-full bg-white shadow-xl flex items-center justify-center",
                    style: {
                        animation: "celebrate-pop 1300ms cubic-bezier(0.16,0.84,0.2,1.4) both"
                    },
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                        viewBox: "0 0 24 24",
                        className: "size-9 text-emerald-600",
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: "2.5",
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            d: "M5 13l4 4L19 7"
                        }, void 0, false, {
                            fileName: "[project]/src/components/my-day.tsx",
                            lineNumber: 165,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/my-day.tsx",
                        lineNumber: 164,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/my-day.tsx",
                    lineNumber: 160,
                    columnNumber: 9
                }, this),
                DOTS.map((dot, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "absolute rounded-full",
                        style: {
                            left: dot.l,
                            top: dot.t,
                            width: 10,
                            height: 10,
                            background: dot.c,
                            animation: `celebrate-pop 1300ms ease-out ${dot.delay}ms both`
                        }
                    }, i, false, {
                        fileName: "[project]/src/components/my-day.tsx",
                        lineNumber: 170,
                        columnNumber: 11
                    }, this))
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/my-day.tsx",
            lineNumber: 158,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/my-day.tsx",
        lineNumber: 153,
        columnNumber: 5
    }, this);
}
function MyDay() {
    const [now, setNow] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [data, setData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        v: 1,
        todos: {}
    });
    const [celebrating, setCelebrating] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const lastCarryRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    // Hydrate on client only to avoid SSR mismatch
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const loaded = loadData();
        const today = todayStr();
        const carried = carryForward(loaded, today);
        lastCarryRef.current = today;
        if (carried !== loaded) saveData(carried);
        setData(carried);
        setNow(new Date());
    }, []);
    // Clock tick every minute
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const tick = ()=>{
            const n = new Date();
            setNow(n);
            // Carry forward if day has rolled over
            const today = todayStr(n);
            if (lastCarryRef.current !== today) {
                setData((prev)=>{
                    const next = carryForward(prev, today);
                    if (next !== prev) saveData(next);
                    return next;
                });
                lastCarryRef.current = today;
            }
        };
        const id = window.setInterval(tick, 60_000);
        return ()=>window.clearInterval(id);
    }, []);
    const write = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((next)=>{
        saveData(next);
        setData(next);
    }, []);
    const today = now ? todayStr(now) : todayStr();
    const items = data.todos[today] ?? [];
    function addItem() {
        const item = {
            id: uid(),
            text: "",
            done: false,
            date: today
        };
        write({
            ...data,
            todos: {
                ...data.todos,
                [today]: [
                    ...items,
                    item
                ]
            }
        });
    }
    function setText(id, text) {
        write({
            ...data,
            todos: {
                ...data.todos,
                [today]: items.map((it)=>it.id === id ? {
                        ...it,
                        text
                    } : it)
            }
        });
    }
    function toggleDone(id) {
        const item = items.find((it)=>it.id === id);
        if (!item) return;
        const wasUndone = !item.done;
        write({
            ...data,
            todos: {
                ...data.todos,
                [today]: items.map((it)=>it.id === id ? {
                        ...it,
                        done: !it.done
                    } : it)
            }
        });
        if (wasUndone) setCelebrating(true);
    }
    function deleteItem(id) {
        write({
            ...data,
            todos: {
                ...data.todos,
                [today]: items.filter((it)=>it.id !== id)
            }
        });
    }
    const cd = now ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lunar$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["countdownToJul2028"])(now) : null;
    const lunarDate = now ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lunar$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getLunarDateString"])(today) : null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-dvh bg-[#f5f4ef] flex justify-center",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "w-full max-w-sm flex flex-col px-5 pb-10",
                style: {
                    paddingTop: "max(2.5rem, env(safe-area-inset-top))"
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                        className: "mb-6",
                        children: now ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                    className: "text-[1.35rem] font-semibold tracking-tight text-[#1a1a1a]",
                                    children: formatDate(now)
                                }, void 0, false, {
                                    fileName: "[project]/src/components/my-day.tsx",
                                    lineNumber: 282,
                                    columnNumber: 15
                                }, this),
                                lunarDate ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "mt-1 text-sm text-[#6b7c79]",
                                    children: [
                                        "農曆 ",
                                        lunarDate
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/my-day.tsx",
                                    lineNumber: 286,
                                    columnNumber: 17
                                }, this) : null
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/my-day.tsx",
                            lineNumber: 281,
                            columnNumber: 13
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "h-8 w-48 rounded-lg bg-black/8 animate-pulse"
                        }, void 0, false, {
                            fileName: "[project]/src/components/my-day.tsx",
                            lineNumber: 290,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/my-day.tsx",
                        lineNumber: 279,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mb-7 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-black/5",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs font-medium tracking-widest text-[#8a9e9b] uppercase",
                                children: "距 2028 · 7 · 1"
                            }, void 0, false, {
                                fileName: "[project]/src/components/my-day.tsx",
                                lineNumber: 296,
                                columnNumber: 11
                            }, this),
                            cd && !cd.past ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-2 flex items-baseline gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-4xl font-bold tabular-nums text-[#1a1a1a]",
                                        children: cd.days
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/my-day.tsx",
                                        lineNumber: 299,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-sm text-[#8a9e9b] mr-2",
                                        children: "天"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/my-day.tsx",
                                        lineNumber: 300,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-2xl font-semibold tabular-nums text-[#1a1a1a]",
                                        children: String(cd.hours).padStart(2, "0")
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/my-day.tsx",
                                        lineNumber: 301,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-sm text-[#8a9e9b] mr-1",
                                        children: "時"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/my-day.tsx",
                                        lineNumber: 302,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-2xl font-semibold tabular-nums text-[#1a1a1a]",
                                        children: String(cd.minutes).padStart(2, "0")
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/my-day.tsx",
                                        lineNumber: 303,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-sm text-[#8a9e9b]",
                                        children: "分"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/my-day.tsx",
                                        lineNumber: 304,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/my-day.tsx",
                                lineNumber: 298,
                                columnNumber: 13
                            }, this) : cd?.past ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-2 text-lg font-semibold text-[#1a1a1a]",
                                children: "已到達"
                            }, void 0, false, {
                                fileName: "[project]/src/components/my-day.tsx",
                                lineNumber: 307,
                                columnNumber: 13
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-2 h-10 w-40 rounded-lg bg-black/8 animate-pulse"
                            }, void 0, false, {
                                fileName: "[project]/src/components/my-day.tsx",
                                lineNumber: 309,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/my-day.tsx",
                        lineNumber: 295,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "mb-3 text-xs font-medium tracking-widest text-[#8a9e9b] uppercase",
                                children: "今天的待辦"
                            }, void 0, false, {
                                fileName: "[project]/src/components/my-day.tsx",
                                lineNumber: 315,
                                columnNumber: 11
                            }, this),
                            items.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm text-[#aab8b5] mb-4",
                                children: "還沒有待辦。加一項開始。"
                            }, void 0, false, {
                                fileName: "[project]/src/components/my-day.tsx",
                                lineNumber: 318,
                                columnNumber: 13
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                className: "flex flex-col gap-2 mb-3",
                                children: items.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(TodoRow, {
                                        item: item,
                                        onText: setText,
                                        onToggle: toggleDone,
                                        onDelete: deleteItem
                                    }, item.id, false, {
                                        fileName: "[project]/src/components/my-day.tsx",
                                        lineNumber: 322,
                                        columnNumber: 17
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/src/components/my-day.tsx",
                                lineNumber: 320,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: addItem,
                                className: "mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#c8d4d2] text-sm text-[#8a9e9b] transition-colors hover:border-[#9ab0ad] hover:text-[#6b7c79] active:bg-[#eaedec]",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-lg leading-none",
                                        children: "+"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/my-day.tsx",
                                        lineNumber: 338,
                                        columnNumber: 13
                                    }, this),
                                    "加一項"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/my-day.tsx",
                                lineNumber: 333,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/my-day.tsx",
                        lineNumber: 314,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/my-day.tsx",
                lineNumber: 276,
                columnNumber: 7
            }, this),
            celebrating ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Celebration, {
                onDone: ()=>setCelebrating(false)
            }, void 0, false, {
                fileName: "[project]/src/components/my-day.tsx",
                lineNumber: 344,
                columnNumber: 22
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/my-day.tsx",
        lineNumber: 275,
        columnNumber: 5
    }, this);
}
// ─── TodoRow ──────────────────────────────────────────────────────────────────
function TodoRow({ item, onText, onToggle, onDelete }) {
    const [swiping, setSwiping] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [offsetX, setOffsetX] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0);
    const startX = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const startY = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const ptrId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const ref = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    function onPointerDown(e) {
        if (e.target.closest("[data-check],[data-input]")) return;
        startX.current = e.clientX;
        startY.current = e.clientY;
        ptrId.current = e.pointerId;
    }
    function onPointerMove(e) {
        if (ptrId.current !== e.pointerId || startX.current === null || startY.current === null) return;
        const dx = e.clientX - startX.current;
        const dy = e.clientY - startY.current;
        if (!swiping) {
            if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
                setSwiping(true);
                ref.current?.setPointerCapture(e.pointerId);
            } else if (Math.abs(dy) > 8) {
                startX.current = null;
            }
            return;
        }
        setOffsetX(Math.min(0, Math.max(dx, -100)));
    }
    function onPointerUp(e) {
        if (ptrId.current !== e.pointerId) return;
        if (swiping && offsetX <= -72) onDelete(item.id);
        setSwiping(false);
        setOffsetX(0);
        startX.current = null;
        ptrId.current = null;
    }
    const textRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const el = textRef.current;
        if (!el) return;
        el.style.height = "0px";
        el.style.height = `${el.scrollHeight}px`;
    }, [
        item.text
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
        ref: ref,
        className: `flex items-start gap-2 rounded-2xl bg-white px-3 ring-1 ring-black/5 transition-opacity ${item.done ? "opacity-45" : ""}`,
        style: {
            transform: offsetX ? `translateX(${offsetX}px)` : undefined,
            touchAction: swiping ? "none" : "pan-y",
            transition: swiping ? undefined : "transform 200ms ease, opacity 200ms"
        },
        onPointerDown: onPointerDown,
        onPointerMove: onPointerMove,
        onPointerUp: onPointerUp,
        onPointerCancel: onPointerUp,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                "data-check": true,
                className: "mt-0.5 shrink-0 grid size-11 place-items-center",
                onClick: ()=>onToggle(item.id),
                "aria-pressed": item.done,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: `flex size-5 items-center justify-center rounded-full border-2 transition-all ${item.done ? "border-emerald-500 bg-emerald-500" : "border-[#c8d4d2] bg-transparent"}`,
                    children: item.done ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                        viewBox: "0 0 12 12",
                        className: "size-3 text-white",
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: "2",
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            d: "M2 6.5l2.5 2.5 5.5-5"
                        }, void 0, false, {
                            fileName: "[project]/src/components/my-day.tsx",
                            lineNumber: 440,
                            columnNumber: 15
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/my-day.tsx",
                        lineNumber: 439,
                        columnNumber: 13
                    }, this) : null
                }, void 0, false, {
                    fileName: "[project]/src/components/my-day.tsx",
                    lineNumber: 431,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/my-day.tsx",
                lineNumber: 424,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                ref: textRef,
                "data-input": true,
                rows: 1,
                value: item.text,
                placeholder: "寫下待辦…",
                onChange: (e)=>onText(item.id, e.target.value),
                className: `min-h-11 flex-1 resize-none overflow-hidden bg-transparent py-2.5 text-base leading-6 outline-none placeholder:text-[#c0ccc9] ${item.done ? "line-through text-[#9ab0ad]" : "text-[#1a1a1a]"}`,
                style: {
                    touchAction: "pan-y"
                }
            }, void 0, false, {
                fileName: "[project]/src/components/my-day.tsx",
                lineNumber: 447,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/my-day.tsx",
        lineNumber: 410,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/lib/lunar.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "countdownToJul2028",
    ()=>countdownToJul2028,
    "getLunarDateString",
    ()=>getLunarDateString
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lunar$2d$javascript$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/lunar-javascript/index.js [app-ssr] (ecmascript)");
;
function getLunarDateString(key) {
    const [yearStr, monthStr, dayStr] = key.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (!year || !month || !day) return "";
    try {
        const solar = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lunar$2d$javascript$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Solar"].fromYmd(year, month, day);
        const lunar = solar.getLunar();
        // getMonth() returns negative for leap months (e.g. -6 for 閏六月)
        const monthCn = lunar.getMonthInChinese().replace("闰", "閏");
        const dayCn = lunar.getDayInChinese();
        return `${monthCn}月${dayCn}`;
    } catch  {
        return "";
    }
}
const TARGET = new Date(2028, 6, 1) // July 1, 2028
;
function countdownToJul2028(now) {
    const diff = TARGET.getTime() - now.getTime();
    if (diff <= 0) return {
        days: 0,
        hours: 0,
        minutes: 0,
        past: true
    };
    const totalMinutes = Math.floor(diff / 60_000);
    const minutes = totalMinutes % 60;
    const totalHours = Math.floor(totalMinutes / 60);
    const hours = totalHours % 24;
    const days = Math.floor(totalHours / 24);
    return {
        days,
        hours,
        minutes,
        past: false
    };
}
}),
];})()

//# sourceMappingURL=src_0v3_6j6q1vd93._.js.map