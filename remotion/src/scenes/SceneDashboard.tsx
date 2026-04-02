import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Sequence } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700"], subsets: ["latin"] });

const StatCard = ({ label, value, color, delay }: { label: string; value: string; color: string; delay: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 150 } });
  return (
    <div style={{
      background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: "28px 32px",
      border: "1px solid rgba(255,255,255,0.08)", flex: 1,
      transform: `scale(${interpolate(s, [0, 1], [0.8, 1])}) translateY(${interpolate(s, [0, 1], [30, 0])}px)`,
      opacity: interpolate(s, [0, 1], [0, 1]),
    }}>
      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 8, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase" as const }}>{label}</div>
      <div style={{ fontSize: 48, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
    </div>
  );
};

const ProgressBar = ({ label, pct, delay }: { label: string; pct: number; delay: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 20 } });
  const barW = interpolate(s, [0, 1], [0, pct]);
  return (
    <div style={{ opacity: interpolate(s, [0, 1], [0, 1]), marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 15, color: "rgba(255,255,255,0.8)" }}>{label}</span>
        <span style={{ fontSize: 15, color: "#00C9A7", fontWeight: 600 }}>{pct}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.08)" }}>
        <div style={{ height: "100%", borderRadius: 4, width: `${barW}%`, background: "linear-gradient(90deg, #0078FF, #00C9A7)" }} />
      </div>
    </div>
  );
};

export const SceneDashboard = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill style={{ padding: 80, fontFamily, justifyContent: "center" }}>
      <div style={{
        fontSize: 18, fontWeight: 600, color: "#00C9A7", letterSpacing: 3, textTransform: "uppercase" as const,
        opacity: interpolate(titleS, [0, 1], [0, 1]),
        marginBottom: 12,
      }}>Dashboard</div>
      <div style={{
        fontSize: 52, fontWeight: 700, color: "#fff", lineHeight: 1.2,
        opacity: interpolate(titleS, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(titleS, [0, 1], [20, 0])}px)`,
        marginBottom: 50,
      }}>
        Vista general de tus proyectos
      </div>

      <div style={{ display: "flex", gap: 24, marginBottom: 50 }}>
        <StatCard label="Proyectos" value="12" color="#0078FF" delay={15} />
        <StatCard label="Fases activas" value="34" color="#00C9A7" delay={25} />
        <StatCard label="Ítems completados" value="89%" color="#60A5FA" delay={35} />
        <StatCard label="Mensajes" value="7" color="#F59E0B" delay={45} />
      </div>

      <div style={{
        background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 32,
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <ProgressBar label="OceanMan Perú 2026" pct={75} delay={50} />
        <ProgressBar label="OceanMan Italia 2026" pct={45} delay={60} />
        <ProgressBar label="OceanMan Dubai 2026" pct={20} delay={70} />
      </div>
    </AbsoluteFill>
  );
};
