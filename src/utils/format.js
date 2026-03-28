export const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
export const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
