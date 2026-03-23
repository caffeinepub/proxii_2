import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Compass,
  Download,
  Loader2,
  MapPin,
  MapPinned,
  PlusCircle,
  Send,
  ShieldCheck,
  Star,
  User,
  Wallet,
  XCircle,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

type Tab = "explore" | "post" | "profile";
type Status = "idle" | "sending" | "success" | "error";

interface LiveTask {
  task_id: string;
  task_name: string;
  price: string;
  location: string;
  Description: string;
  telegram_id: string;
  status: string;
  deadline: string;
  category?: string;
}

const SHEETDB = "https://sheetdb.io/api/v1/m2d47h1nseqog";

async function postUser(data: object) {
  const res = await fetch(SHEETDB, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sheet: "users", data: [data] }),
  });
  if (!res.ok) throw new Error("Failed to save profile");
}

async function postTask(data: object) {
  const res = await fetch(SHEETDB, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sheet: "task", data: [data] }),
  });
  if (!res.ok) throw new Error("Failed to post task");
}

async function fetchTasks(): Promise<LiveTask[]> {
  const res = await fetch(`${SHEETDB}?sheet=task`);
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return res.json();
}

const WHY_FEATURES = [
  {
    icon: Zap,
    label: "Fast",
    desc: "Tasks fulfilled within minutes on campus",
  },
  {
    icon: MapPinned,
    label: "Local",
    desc: "Only students in your campus network",
  },
  {
    icon: ShieldCheck,
    label: "Trusted",
    desc: "Verified college email IDs only",
  },
  { icon: Wallet, label: "Cashless", desc: "Pay safely through UPI or wallet" },
];

const inputBase: React.CSSProperties = {
  background: "oklch(0.16 0.01 265)",
  border: "1px solid oklch(0.28 0.012 265)",
  color: "oklch(0.96 0 0)",
  borderRadius: "0.75rem",
  padding: "0.625rem 0.875rem",
  width: "100%",
  fontSize: "0.875rem",
  outline: "none",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
};

const inputFocus: React.CSSProperties = {
  borderColor: "oklch(0.60 0.22 295)",
  boxShadow: "0 0 0 2px oklch(0.60 0.22 295 / 0.2)",
};

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      style={{
        ...inputBase,
        ...(focused && !props.disabled ? inputFocus : {}),
        ...(props.disabled ? { opacity: 0.5, cursor: "not-allowed" } : {}),
        ...props.style,
      }}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
    />
  );
}

function StyledTextarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  const [focused, setFocused] = useState(false);
  return (
    <Textarea
      {...props}
      style={{
        ...inputBase,
        resize: "vertical",
        minHeight: "100px",
        ...(focused ? inputFocus : {}),
        ...props.style,
      }}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
    />
  );
}

function AnimatedBackground() {
  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="radial-glow absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.45 0.22 295 / 0.18) 0%, transparent 70%)",
        }}
      />
      <svg
        className="grid-layer-1 absolute inset-0 w-full h-full opacity-[0.12]"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label="Decorative grid background"
      >
        <title>Decorative animated grid</title>
        <defs>
          <pattern
            id="curvy-grid-1"
            x="0"
            y="0"
            width="80"
            height="80"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 0 40 Q 20 20 40 40 Q 60 60 80 40"
              stroke="oklch(0.35 0.08 265)"
              strokeWidth="0.8"
              fill="none"
            />
            <path
              d="M 40 0 Q 20 20 40 40 Q 60 60 40 80"
              stroke="oklch(0.35 0.08 265)"
              strokeWidth="0.8"
              fill="none"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#curvy-grid-1)" />
      </svg>
      <svg
        className="grid-layer-2 absolute inset-0 w-full h-full opacity-[0.07]"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label="Decorative grid overlay"
      >
        <title>Decorative animated grid overlay</title>
        <defs>
          <pattern
            id="curvy-grid-2"
            x="0"
            y="0"
            width="120"
            height="120"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 0 60 C 30 30 90 90 120 60"
              stroke="oklch(0.50 0.15 295)"
              strokeWidth="0.5"
              fill="none"
            />
            <path
              d="M 60 0 C 30 30 90 90 60 120"
              stroke="oklch(0.50 0.15 295)"
              strokeWidth="0.5"
              fill="none"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#curvy-grid-2)" />
      </svg>
    </div>
  );
}

function Header({
  activeTab,
  onTabChange,
}: { activeTab: Tab; onTabChange: (t: Tab) => void }) {
  return (
    <header className="sticky top-0 z-40 glass-nav px-4 sm:px-6">
      <div className="max-w-3xl mx-auto flex items-center justify-between h-14">
        <button
          type="button"
          data-ocid="header.home_link"
          onClick={() => onTabChange("explore")}
          className="text-xl font-extrabold purple-gradient-text tracking-tight cursor-pointer"
        >
          Proxii Hub
        </button>
        <nav className="hidden sm:flex items-center gap-5 text-sm">
          {(["explore", "post", "profile"] as Tab[]).map((tab) => (
            <button
              type="button"
              key={tab}
              data-ocid={`nav.${tab}.link`}
              onClick={() => onTabChange(tab)}
              className={`capitalize transition-colors ${
                activeTab === tab
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "post" ? "Post Task" : tab}
            </button>
          ))}
        </nav>
        <Button
          type="button"
          data-ocid="header.install_button"
          size="sm"
          className="rounded-full text-xs px-4 glow-button purple-gradient border-0 text-white"
        >
          <Download className="w-3 h-3 mr-1" />
          Install App
        </Button>
      </div>
    </header>
  );
}

function HeroSection({ onExplore }: { onExplore: () => void }) {
  return (
    <section className="relative text-center pt-16 pb-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6"
          style={{
            background: "oklch(0.45 0.22 295 / 0.15)",
            border: "1px solid oklch(0.55 0.22 295 / 0.3)",
          }}
        >
          <Star className="w-3 h-3" style={{ color: "oklch(0.70 0.22 295)" }} />
          <span style={{ color: "oklch(0.80 0.18 295)" }}>
            Beta — Campus-only network
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
          <span className="purple-gradient-text">Proxii Hub:</span>{" "}
          <span className="text-foreground">
            Your Campus, Your Community, Your Local Marketplace
          </span>
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg mb-8 max-w-xl mx-auto">
          Post tasks, find help, and get things done — all within your college
          campus.
        </p>
        <Button
          type="button"
          data-ocid="hero.get_app_button"
          onClick={onExplore}
          className="glow-button purple-gradient border-0 text-white font-semibold px-8 py-3 h-auto rounded-full text-base"
        >
          Get the App
          <Send className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </section>
  );
}

function TaskCardComponent({ task, index }: { task: LiveTask; index: number }) {
  const telegramHandle = task.telegram_id?.replace(/^@/, "") ?? "";
  const telegramUrl = telegramHandle
    ? `https://t.me/${telegramHandle}?text=${encodeURIComponent(
        `Hi! I am interested in your task: ${task.task_name}`,
      )}`
    : "";

  return (
    <article
      data-ocid={`tasks.item.${index}`}
      className="card-surface rounded-2xl p-4 flex flex-col gap-3 transition-all duration-300 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-foreground leading-snug flex-1">
          {task.task_name}
        </h3>
        <span
          className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full"
          style={{
            background: "oklch(0.45 0.22 295 / 0.2)",
            color: "oklch(0.78 0.20 295)",
            border: "1px solid oklch(0.50 0.18 295 / 0.4)",
          }}
        >
          ₹{task.price}
        </span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {task.Description}
      </p>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div
          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
          style={{
            background: "oklch(0.22 0.01 265)",
            color: "oklch(0.72 0 0)",
          }}
        >
          <MapPin className="w-3 h-3" />
          {task.location}
        </div>
        {task.deadline ? (
          <span className="text-xs" style={{ color: "oklch(0.60 0 0)" }}>
            Due: {task.deadline}
          </span>
        ) : null}
      </div>
      {telegramHandle ? (
        <Button
          type="button"
          data-ocid={`tasks.item.${index}.button`}
          className="w-full mt-1 glow-button purple-gradient border-0 text-white text-xs font-semibold rounded-xl h-9"
          onClick={() =>
            window.open(telegramUrl, "_blank", "noopener,noreferrer")
          }
        >
          <Send className="w-3.5 h-3.5 mr-2" />
          Discuss on Telegram
        </Button>
      ) : (
        <Button
          type="button"
          data-ocid={`tasks.item.${index}.button`}
          disabled
          className="w-full mt-1 rounded-xl h-9 text-xs font-semibold"
          style={{
            background: "oklch(0.22 0.01 265)",
            color: "oklch(0.50 0 0)",
            border: "1px solid oklch(0.28 0.012 265)",
          }}
        >
          No Contact Info
        </Button>
      )}
    </article>
  );
}

function WhyProxiiSection() {
  return (
    <section className="px-4 py-8 max-w-3xl mx-auto">
      <h2 className="text-xl sm:text-2xl font-bold text-center mb-8">
        Why Proxii Hub?
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {WHY_FEATURES.map((f) => (
          <div
            key={f.label}
            className="flex flex-col items-center text-center gap-3 p-4 rounded-2xl"
            style={{
              background: "oklch(0.15 0.01 265 / 0.6)",
              border: "1px solid oklch(0.24 0.012 265)",
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "oklch(0.45 0.22 295 / 0.15)",
                border: "1px solid oklch(0.50 0.18 295 / 0.3)",
              }}
            >
              <f.icon
                className="w-5 h-5"
                style={{ color: "oklch(0.70 0.20 295)" }}
              />
            </div>
            <p className="text-sm font-bold text-foreground">{f.label}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {f.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  const utm = encodeURIComponent(window.location.hostname);
  return (
    <footer className="mt-8 pb-28 px-4 max-w-3xl mx-auto">
      <div
        className="rounded-2xl p-6"
        style={{
          background: "oklch(0.14 0.01 265 / 0.6)",
          border: "1px solid oklch(0.22 0.01 265)",
        }}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="font-bold text-sm purple-gradient-text">
              Proxii Hub
            </span>
            <span className="hover:text-foreground transition-colors cursor-pointer">
              Privacy
            </span>
            <span className="hover:text-foreground transition-colors cursor-pointer">
              Terms
            </span>
          </div>
          <p>
            © {year}. Built with ♥ using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${utm}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors underline underline-offset-2"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

function PostTaskScreen() {
  const emptyPost = {
    title: "",
    price: "",
    location: "",
    telegram: "",
    deadline: "",
    description: "",
  };
  const [fields, setFields] = useState(emptyPost);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [lastTask, setLastTask] = useState(emptyPost);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setStatus("idle");
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");
    try {
      await postTask({
        task_id: `task_${Date.now()}`,
        task_name: fields.title,
        price: fields.price,
        location: fields.location,
        deadline: fields.deadline,
        Description: fields.description,
        telegram_id: fields.telegram.replace(/^@/, ""),
        status: "active",
      });
      setLastTask(fields);
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  function handleReset() {
    setFields(emptyPost);
    setStatus("idle");
    setErrorMsg("");
  }

  if (status === "success") {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div
          data-ocid="post_task.success_state"
          className="max-w-md w-full mx-auto rounded-2xl p-8 flex flex-col items-center gap-5"
          style={{
            background: "oklch(0.16 0.01 265)",
            border: "1px solid oklch(0.28 0.012 265)",
          }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              background: "oklch(0.35 0.12 145 / 0.2)",
              border: "2px solid oklch(0.55 0.15 145 / 0.4)",
            }}
          >
            <CheckCircle2
              className="w-8 h-8"
              style={{ color: "oklch(0.65 0.18 145)" }}
            />
          </div>
          <h2 className="text-2xl font-bold text-foreground text-center">
            Task Posted! 🎉
          </h2>
          <p className="text-muted-foreground text-sm text-center">
            <span className="font-semibold text-foreground">
              &ldquo;{lastTask.title}&rdquo;
            </span>{" "}
            has been posted. Campus helpers will reach out on Telegram soon.
          </p>
          <div
            className="w-full rounded-xl p-4 text-left text-xs space-y-2"
            style={{
              background: "oklch(0.13 0.01 265)",
              border: "1px solid oklch(0.22 0.01 265)",
            }}
          >
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price</span>
              <span
                className="font-bold"
                style={{ color: "oklch(0.78 0.20 295)" }}
              >
                ₹{lastTask.price}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location</span>
              <span className="text-foreground">{lastTask.location}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deadline</span>
              <span className="text-foreground">{lastTask.deadline}</span>
            </div>
          </div>
          <Button
            type="button"
            data-ocid="post_task.post_another_button"
            onClick={handleReset}
            className="w-full glow-button purple-gradient border-0 text-white font-semibold rounded-xl h-11"
          >
            Post Another Task
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-8 pb-32">
      <div className="max-w-md mx-auto">
        <div className="flex flex-col items-center text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: "oklch(0.45 0.22 295 / 0.15)",
              border: "1px solid oklch(0.50 0.18 295 / 0.3)",
            }}
          >
            <PlusCircle
              className="w-7 h-7"
              style={{ color: "oklch(0.70 0.20 295)" }}
            />
          </div>
          <h2 className="text-2xl font-bold">Post a Task</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Let campus helpers come to you.
          </p>
        </div>

        {status === "error" && (
          <div
            data-ocid="post_task.error_state"
            className="flex items-center gap-3 rounded-xl px-4 py-3 mb-5 text-sm font-medium"
            style={{
              background: "oklch(0.25 0.08 25 / 0.3)",
              border: "1px solid oklch(0.45 0.15 25 / 0.5)",
              color: "oklch(0.75 0.18 25)",
            }}
          >
            <XCircle className="w-4 h-4 shrink-0" />
            {errorMsg || "Failed to post task. Please try again."}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          data-ocid="post_task.panel"
          className="rounded-2xl p-6 space-y-5"
          style={{
            background: "oklch(0.14 0.01 265 / 0.8)",
            border: "1px solid oklch(0.24 0.012 265)",
          }}
        >
          <div className="flex flex-col gap-1">
            <Label
              htmlFor="post-title"
              className="text-sm font-medium text-muted-foreground"
            >
              Task Title <span style={{ color: "oklch(0.65 0.22 15)" }}>*</span>
            </Label>
            <StyledInput
              id="post-title"
              name="title"
              type="text"
              data-ocid="post_task.input"
              placeholder="Need DBMS Notes"
              value={fields.title}
              onChange={handleChange}
              required
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label
              htmlFor="post-price"
              className="text-sm font-medium text-muted-foreground"
            >
              Price in ₹ <span style={{ color: "oklch(0.65 0.22 15)" }}>*</span>
            </Label>
            <StyledInput
              id="post-price"
              name="price"
              type="number"
              data-ocid="post_task.input"
              placeholder="e.g. 150"
              min={0}
              value={fields.price}
              onChange={handleChange}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label
              htmlFor="post-location"
              className="text-sm font-medium text-muted-foreground"
            >
              Location / Pickup Point{" "}
              <span style={{ color: "oklch(0.65 0.22 15)" }}>*</span>
            </Label>
            <StyledInput
              id="post-location"
              name="location"
              type="text"
              data-ocid="post_task.input"
              placeholder="e.g. Library Ground Floor"
              value={fields.location}
              onChange={handleChange}
              required
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label
              htmlFor="post-telegram"
              className="text-sm font-medium text-muted-foreground"
            >
              Your Telegram Username{" "}
              <span style={{ color: "oklch(0.65 0.22 15)" }}>*</span>
            </Label>
            <StyledInput
              id="post-telegram"
              name="telegram"
              type="text"
              data-ocid="post_task.input"
              placeholder="e.g. arjunmehta"
              value={fields.telegram}
              onChange={handleChange}
              required
              autoComplete="username"
            />
            <p className="text-xs text-muted-foreground mt-1">
              No @ symbol needed
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <Label
              htmlFor="post-deadline"
              className="text-sm font-medium text-muted-foreground"
            >
              Deadline <span style={{ color: "oklch(0.65 0.22 15)" }}>*</span>
            </Label>
            <StyledInput
              id="post-deadline"
              name="deadline"
              type="date"
              data-ocid="post_task.input"
              value={fields.deadline}
              onChange={handleChange}
              required
              style={{ colorScheme: "dark" }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label
              htmlFor="post-description"
              className="text-sm font-medium text-muted-foreground"
            >
              Detailed Description{" "}
              <span style={{ color: "oklch(0.65 0.22 15)" }}>*</span>
            </Label>
            <StyledTextarea
              id="post-description"
              name="description"
              data-ocid="post_task.textarea"
              placeholder="Describe the task in detail — what, when, and any special requirements..."
              rows={4}
              value={fields.description}
              onChange={handleChange}
              required
            />
          </div>

          <Button
            type="submit"
            data-ocid="post_task.submit_button"
            disabled={status === "sending"}
            className="w-full glow-button purple-gradient border-0 text-white font-semibold rounded-xl h-11 mt-2"
          >
            {status === "sending" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4 mr-2" />
                Post Task
              </>
            )}
          </Button>
        </form>
      </div>
    </main>
  );
}

function ProfileScreen({
  onProfileSaved,
  profileAlreadySaved,
}: {
  onProfileSaved: () => void;
  profileAlreadySaved: boolean;
}) {
  const [fields, setFields] = useState({
    fullName: "",
    telegram: "",
    phone: "",
    upiId: "",
    collegeId: "",
  });
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setStatus("idle");
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (profileAlreadySaved) return;
    setStatus("sending");
    setErrorMsg("");
    try {
      await postUser({
        full_name: fields.fullName,
        telegram_id: fields.telegram.replace(/^@/, ""),
        phone_number: fields.phone,
        upi_id: fields.upiId,
        student_id: fields.collegeId,
      });
      setStatus("success");
      setTimeout(() => {
        onProfileSaved();
      }, 1000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  const initials = fields.fullName
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  return (
    <main className="flex-1 px-4 py-8 pb-32">
      <div className="max-w-md mx-auto">
        <div className="flex flex-col items-center text-center mb-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
            style={{
              background: "oklch(0.45 0.22 295 / 0.15)",
              border: "2px solid oklch(0.50 0.18 295 / 0.4)",
            }}
          >
            {initials ? (
              <span
                className="text-2xl font-extrabold"
                style={{ color: "oklch(0.78 0.22 295)" }}
              >
                {initials}
              </span>
            ) : (
              <User
                className="w-10 h-10"
                style={{ color: "oklch(0.70 0.20 295)" }}
              />
            )}
          </div>
          <h2 className="text-2xl font-bold">
            {fields.fullName || "Complete Your Profile"}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Fill in your details to start posting and completing tasks.
          </p>
        </div>

        {profileAlreadySaved && (
          <div
            data-ocid="profile.success_state"
            className="flex items-center gap-3 rounded-xl px-4 py-3 mb-5 text-sm font-medium"
            style={{
              background: "oklch(0.25 0.08 145 / 0.25)",
              border: "1px solid oklch(0.45 0.15 145 / 0.5)",
              color: "oklch(0.72 0.18 145)",
            }}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Your profile has already been set up.
          </div>
        )}

        {status === "success" && !profileAlreadySaved && (
          <div
            data-ocid="profile.success_state"
            className="flex items-center gap-3 rounded-xl px-4 py-3 mb-5 text-sm font-medium"
            style={{
              background: "oklch(0.25 0.08 145 / 0.3)",
              border: "1px solid oklch(0.45 0.15 145 / 0.5)",
              color: "oklch(0.75 0.18 145)",
            }}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Profile saved successfully!
          </div>
        )}

        {status === "error" && (
          <div
            data-ocid="profile.error_state"
            className="flex items-center gap-3 rounded-xl px-4 py-3 mb-5 text-sm font-medium"
            style={{
              background: "oklch(0.25 0.08 25 / 0.3)",
              border: "1px solid oklch(0.45 0.15 25 / 0.5)",
              color: "oklch(0.75 0.18 25)",
            }}
          >
            <XCircle className="w-4 h-4 shrink-0" />
            {errorMsg || "Failed to save profile. Please try again."}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          data-ocid="profile.panel"
          className="rounded-2xl p-6 space-y-5"
          style={{
            background: "oklch(0.14 0.01 265 / 0.8)",
            border: "1px solid oklch(0.24 0.012 265)",
          }}
        >
          <div className="flex flex-col gap-1">
            <Label
              htmlFor="fullName"
              className="text-sm font-medium text-muted-foreground"
            >
              Full Name <span style={{ color: "oklch(0.65 0.22 15)" }}>*</span>
            </Label>
            <StyledInput
              id="fullName"
              name="fullName"
              type="text"
              data-ocid="profile.input"
              placeholder="e.g. Arjun Mehta"
              value={fields.fullName}
              onChange={handleChange}
              required={!profileAlreadySaved}
              disabled={profileAlreadySaved}
              autoComplete="name"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label
              htmlFor="telegram"
              className="text-sm font-medium text-muted-foreground"
            >
              Telegram Username{" "}
              <span style={{ color: "oklch(0.65 0.22 15)" }}>*</span>
            </Label>
            <StyledInput
              id="telegram"
              name="telegram"
              type="text"
              data-ocid="profile.input"
              placeholder="e.g. arjunmehta"
              value={fields.telegram}
              onChange={handleChange}
              required={!profileAlreadySaved}
              disabled={profileAlreadySaved}
              autoComplete="username"
            />
            <p className="text-xs text-muted-foreground mt-1">
              No @ symbol needed
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <Label
              htmlFor="phone"
              className="text-sm font-medium text-muted-foreground"
            >
              Phone Number{" "}
              <span style={{ color: "oklch(0.65 0.22 15)" }}>*</span>
            </Label>
            <StyledInput
              id="phone"
              name="phone"
              type="tel"
              data-ocid="profile.input"
              placeholder="e.g. 9876543210"
              value={fields.phone}
              onChange={handleChange}
              required={!profileAlreadySaved}
              disabled={profileAlreadySaved}
              autoComplete="tel"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label
              htmlFor="upiId"
              className="text-sm font-medium text-muted-foreground"
            >
              UPI ID <span style={{ color: "oklch(0.65 0.22 15)" }}>*</span>
            </Label>
            <StyledInput
              id="upiId"
              name="upiId"
              type="text"
              data-ocid="profile.input"
              placeholder="name@okicici"
              value={fields.upiId}
              onChange={handleChange}
              required={!profileAlreadySaved}
              disabled={profileAlreadySaved}
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label
              htmlFor="collegeId"
              className="text-sm font-medium text-muted-foreground"
            >
              College / Student ID{" "}
              <span style={{ color: "oklch(0.65 0.22 15)" }}>*</span>
            </Label>
            <StyledInput
              id="collegeId"
              name="collegeId"
              type="text"
              data-ocid="profile.input"
              placeholder="e.g. CS21B042"
              value={fields.collegeId}
              onChange={handleChange}
              required={!profileAlreadySaved}
              disabled={profileAlreadySaved}
              autoComplete="off"
            />
          </div>

          <Button
            type="submit"
            data-ocid="profile.submit_button"
            disabled={status === "sending" || profileAlreadySaved}
            className={`w-full border-0 text-white font-semibold rounded-xl h-11 mt-2 ${
              profileAlreadySaved
                ? "opacity-50 cursor-not-allowed"
                : "glow-button purple-gradient"
            }`}
            style={{
              background: profileAlreadySaved
                ? "oklch(0.30 0.04 265)"
                : undefined,
              boxShadow: profileAlreadySaved ? "none" : undefined,
            }}
          >
            {status === "sending" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : profileAlreadySaved ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Profile Saved
              </>
            ) : (
              "Save Profile"
            )}
          </Button>
        </form>

        <div
          className="w-full rounded-2xl p-4 mt-5"
          style={{
            background: "oklch(0.16 0.01 265)",
            border: "1px solid oklch(0.24 0.012 265)",
          }}
        >
          {(
            [
              ["Tasks Posted", "0"],
              ["Tasks Completed", "0"],
              ["Total Earned", "₹0"],
              ["Rating", "—"],
            ] as [string, string][]
          ).map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between py-2 border-b border-border last:border-0"
            >
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="text-sm font-bold">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function BottomNav({
  active,
  onTabChange,
}: { active: Tab; onTabChange: (t: Tab) => void }) {
  const tabs: { id: Tab; icon: typeof Compass; label: string }[] = [
    { id: "explore", icon: Compass, label: "Explore" },
    { id: "post", icon: PlusCircle, label: "Post Task" },
    { id: "profile", icon: User, label: "Profile" },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 glass-nav px-4 py-2"
      aria-label="Bottom navigation"
    >
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          const isPost = tab.id === "post";
          return (
            <button
              type="button"
              key={tab.id}
              data-ocid={`bottomnav.${tab.id}.tab`}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-1 py-2 px-4 rounded-2xl transition-all duration-200 ${
                isPost ? "relative -top-2" : ""
              }`}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
            >
              {isPost ? (
                <span
                  className="w-12 h-12 rounded-full flex items-center justify-center glow-button"
                  style={{
                    background: isActive
                      ? "linear-gradient(135deg, oklch(0.45 0.22 295), oklch(0.70 0.25 295))"
                      : "linear-gradient(135deg, oklch(0.38 0.20 295), oklch(0.60 0.22 295))",
                    boxShadow: isActive
                      ? "0 0 20px -4px oklch(0.60 0.22 295 / 0.7)"
                      : "none",
                  }}
                >
                  <PlusCircle className="w-6 h-6 text-white" />
                </span>
              ) : (
                <tab.icon
                  className="w-6 h-6 transition-all"
                  style={{
                    color: isActive
                      ? "oklch(0.70 0.22 295)"
                      : "oklch(0.55 0 0)",
                  }}
                />
              )}
              <span
                className="text-xs font-medium"
                style={{
                  color: isActive ? "oklch(0.70 0.22 295)" : "oklch(0.55 0 0)",
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function ExploreScreen({
  tasks,
  loading,
  fetchError,
}: {
  tasks: LiveTask[];
  loading: boolean;
  fetchError: string;
}) {
  return (
    <main className="flex-1">
      <HeroSection onExplore={() => {}} />

      <section className="px-4 py-8 max-w-3xl mx-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-center mb-6">
          Featured Campus Tasks &amp; Listings
        </h2>

        {loading && (
          <div
            data-ocid="tasks.loading_state"
            className="flex flex-col items-center justify-center py-16 gap-3"
          >
            <Loader2
              className="w-8 h-8 animate-spin"
              style={{ color: "oklch(0.70 0.22 295)" }}
            />
            <p className="text-sm text-muted-foreground">
              Loading campus tasks...
            </p>
          </div>
        )}

        {!loading && fetchError && (
          <div
            data-ocid="tasks.error_state"
            className="flex items-center justify-center gap-2 py-10 text-sm"
            style={{ color: "oklch(0.70 0.18 25)" }}
          >
            <XCircle className="w-4 h-4" />
            {fetchError}
          </div>
        )}

        {!loading && !fetchError && tasks.length === 0 && (
          <div
            data-ocid="tasks.empty_state"
            className="text-center py-16 text-muted-foreground text-sm"
          >
            No tasks found. Be the first to post one!
          </div>
        )}

        {!loading && !fetchError && tasks.length > 0 && (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            data-ocid="tasks.list"
          >
            {tasks.map((task, i) => (
              <TaskCardComponent
                key={task.task_id || i}
                task={task}
                index={i + 1}
              />
            ))}
          </div>
        )}
      </section>

      <WhyProxiiSection />
      <Footer />
    </main>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("explore");
  const [tasks, setTasks] = useState<LiveTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksFetched, setTasksFetched] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [profileSaved, setProfileSaved] = useState(
    () => localStorage.getItem("proxii_profile_saved") === "true",
  );

  useEffect(() => {
    if (!tasksFetched) {
      setTasksLoading(true);
      fetchTasks()
        .then((data) => {
          setTasks(data);
          setTasksFetched(true);
        })
        .catch((err) => {
          setFetchError(
            err instanceof Error ? err.message : "Failed to load tasks",
          );
          setTasksFetched(true);
        })
        .finally(() => setTasksLoading(false));
    }
  }, [tasksFetched]);

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    if (tab === "explore" && !tasksFetched) {
      setTasksLoading(true);
      fetchTasks()
        .then((data) => {
          setTasks(data);
          setTasksFetched(true);
        })
        .catch((err) => {
          setFetchError(
            err instanceof Error ? err.message : "Failed to load tasks",
          );
          setTasksFetched(true);
        })
        .finally(() => setTasksLoading(false));
    }
  }

  function handleProfileSaved() {
    localStorage.setItem("proxii_profile_saved", "true");
    setProfileSaved(true);
    handleTabChange("explore");
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <AnimatedBackground />
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header activeTab={activeTab} onTabChange={handleTabChange} />
        {activeTab === "explore" && (
          <ExploreScreen
            tasks={tasks}
            loading={tasksLoading}
            fetchError={fetchError}
          />
        )}
        {activeTab === "post" && <PostTaskScreen />}
        {activeTab === "profile" && (
          <ProfileScreen
            onProfileSaved={handleProfileSaved}
            profileAlreadySaved={profileSaved}
          />
        )}
      </div>
      <BottomNav active={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
