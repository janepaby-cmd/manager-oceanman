import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700"], subsets: ["latin"] });

const PhaseItem = ({ title, done, delay }: { title: string; done: boolean; delay: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18 } });
  const checkS = spring({ frame: frame - delay - 10, fps, config: { damping: 12, stiffness: 200 } });
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, padding: "12px 0",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      opacity: interpolate(s, [0, 1], [0, 1]),
      transform: `translateX(${interpolate(s, [0, 1], [40, 0])}px)`,
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: 6,
        border: done ? "none" : "2px solid rgba(255,255,255,0.2)",
        background: done ? "linear-gradient(135deg, #0078FF, #00C9A7)" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transform: `scale(${done ? checkS : 1})`,
      }}>
        {done && <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>✓</span>}
      </div>
      <span style={{
        fontSize: 16, color: done ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.9)",
        textDecoration: done ? "line-through" : "none",
      }}>{title}</span>
    </div>
  );
};

export const SceneProjectsEN = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame, fps, config: { damping: 20 } });

  const items = [
    { title: "Route reconnaissance", done: true },
    { title: "GPS course capture", done: true },
    { title: "Government permits", done: false },
    { title: "Local federation agreements", done: false },
    { title: "Maritime safety plan", done: false },
  ];

  return (
    <AbsoluteFill style={{ fontFamily, display: "flex" }}>
      <div style={{ flex: 1, padding: "80px 60px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{
          fontSize: 18, fontWeight: 600, color: "#00C9A7", letterSpacing: 3, textTransform: "uppercase" as const,
          opacity: interpolate(titleS, [0, 1], [0, 1]), marginBottom: 12,
        }}>Projects</div>
        <div style={{
          fontSize: 46, fontWeight: 700, color: "#fff", lineHeight: 1.2,
          opacity: interpolate(titleS, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(titleS, [0, 1], [20, 0])}px)`,
          marginBottom: 16,
        }}>
          Phases, items & tracking
        </div>
        <div style={{
          fontSize: 18, color: "rgba(255,255,255,0.6)", lineHeight: 1.6,
          opacity: interpolate(frame, [15, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          maxWidth: 500,
        }}>
          Break down each project into phases with work items. Attach files, digital signatures and automatic notifications.
        </div>
      </div>
      <div style={{ flex: 1, padding: "80px 60px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          background: "rgba(255,255,255,0.05)", borderRadius: 20, padding: "32px 36px",
          border: "1px solid rgba(255,255,255,0.08)", width: "100%", maxWidth: 500,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Phase 1 — Planning</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>OceanMan Peru 2026</div>
          {items.map((item, i) => (
            <PhaseItem key={i} title={item.title} done={item.done} delay={20 + i * 12} />
          ))}
          <div style={{ marginTop: 20, display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ height: 6, borderRadius: 3, flex: 1, background: "rgba(255,255,255,0.08)" }}>
              <div style={{ height: "100%", borderRadius: 3, width: "40%", background: "linear-gradient(90deg, #0078FF, #00C9A7)" }} />
            </div>
            <span style={{ fontSize: 14, color: "#00C9A7", fontWeight: 600 }}>40%</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
