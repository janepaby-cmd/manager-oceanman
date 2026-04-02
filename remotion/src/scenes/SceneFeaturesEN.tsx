import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700"], subsets: ["latin"] });

const FeatureCard = ({ icon, title, desc, delay, col }: { icon: string; title: string; desc: string; delay: number; col: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 120 } });
  return (
    <div style={{
      background: "rgba(255,255,255,0.05)", borderRadius: 20, padding: "36px 30px",
      border: "1px solid rgba(255,255,255,0.08)", flex: 1,
      transform: `scale(${interpolate(s, [0, 1], [0.85, 1])}) translateY(${interpolate(s, [0, 1], [40, 0])}px)`,
      opacity: interpolate(s, [0, 1], [0, 1]),
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: `linear-gradient(135deg, ${col}33, ${col}11)`,
        border: `1px solid ${col}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 28, marginBottom: 20,
      }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 10, lineHeight: 1.3 }}>{title}</div>
      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
};

export const SceneFeaturesEN = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame, fps, config: { damping: 20 } });

  const features = [
    { icon: "💬", title: "Comments", desc: "Threaded discussions on every item with @mentions and replies", col: "#6366F1" },
    { icon: "📧", title: "Auto Emails", desc: "Notifications on item completion with attached files", col: "#0078FF" },
    { icon: "💰", title: "Expenses", desc: "Per-project expense tracking with smart OCR ticket scanning", col: "#F59E0B" },
    { icon: "📨", title: "Messaging", desc: "Internal communication with priority and read confirmation", col: "#10B981" },
  ];

  return (
    <AbsoluteFill style={{ fontFamily, padding: 80, justifyContent: "center" }}>
      <div style={{ textAlign: "center" as const, marginBottom: 60 }}>
        <div style={{
          fontSize: 18, fontWeight: 600, color: "#00C9A7", letterSpacing: 3, textTransform: "uppercase" as const,
          opacity: interpolate(titleS, [0, 1], [0, 1]), marginBottom: 12,
        }}>Features</div>
        <div style={{
          fontSize: 52, fontWeight: 700, color: "#fff", lineHeight: 1.2,
          opacity: interpolate(titleS, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(titleS, [0, 1], [20, 0])}px)`,
        }}>
          Everything you need
        </div>
      </div>
      <div style={{ display: "flex", gap: 24 }}>
        {features.map((f, i) => (
          <FeatureCard key={i} {...f} delay={20 + i * 15} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 40, marginTop: 40, justifyContent: "center" }}>
        {["🔐 RBAC Permissions", "🌐 Multilanguage", "✍️ Digital Signatures", "📋 Templates"].map((label, i) => {
          const s = spring({ frame: frame - 70 - i * 8, fps, config: { damping: 18 } });
          return (
            <div key={i} style={{
              fontSize: 16, color: "rgba(255,255,255,0.7)", fontWeight: 500,
              opacity: interpolate(s, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px)`,
              background: "rgba(255,255,255,0.05)", padding: "10px 20px", borderRadius: 30,
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
              {label}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
