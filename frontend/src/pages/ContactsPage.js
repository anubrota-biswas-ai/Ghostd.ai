import { Users } from "lucide-react";

export default function ContactsPage() {
  return (
    <div
      data-testid="contacts-page"
      style={{
        padding: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.95)",
          borderRadius: 14,
          padding: 40,
          textAlign: "center",
          maxWidth: 400,
        }}
      >
        <Users
          size={40}
          style={{ color: "rgba(43,63,191,0.3)", marginBottom: 16 }}
        />
        <h2
          style={{
            fontSize: 18,
            fontWeight: 300,
            color: "#1a1f3c",
            letterSpacing: "-0.03em",
            marginBottom: 8,
          }}
        >
          Contacts
        </h2>
        <p style={{ fontSize: 12, color: "#8892b0", lineHeight: 1.5 }}>
          Manage your hiring contacts, recruiters, and interviewers across all
          your applications.
        </p>
      </div>
    </div>
  );
}
