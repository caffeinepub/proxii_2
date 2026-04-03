import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Compass,
  Download,
  Edit2,
  ExternalLink,
  Loader2,
  Lock,
  LogOut,
  MapPin,
  MapPinned,
  MessageCircle,
  PlusCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Star,
  User,
  Wallet,
  XCircle,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Tab = "explore" | "post" | "profile";
type Status = "idle" | "sending" | "success" | "error";
type AuthView = "login" | "create";

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
  user_id_origintor?: string;
  applicants?: string;
  user_id_recipient?: string;
  payment_status?: string;
}

interface UserRow {
  user_id: string;
  full_name: string;
  email_id: string;
  telegram_id: string;
  phone_number: string;
  upi_id: string;
  upi_type: string;
  student_id: string;
  password_hash: string;
}
interface TaskHistory {
  task_id: string;
  task_name: string;
  user_id_origintor: string;
  user_id_recipient: string;
  status: string;
  completion_date: string;
  payment_status: string;
  price: string;
  rating_score: string;
}

interface FeedbackRow {
  task_id: string;
  worker_id?: string;
  user_id_recipient?: string;
  rating: string;
}

const SHEETDB = "https://sheetdb.io/api/v1/m2d47h1nseqog";
const FETCH_TIMEOUT_MS = 12000; // 12 second timeout for all SheetDB calls

// Fetch with timeout to avoid infinite "sending" state on slow/unresponsive API
async function fetchWithTimeout(
  url: string,
  options?: RequestInit,
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ── SheetDB helpers ──────────────────────────────────────────────────────────
async function postTask(data: object) {
  const res = await fetchWithTimeout(SHEETDB, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sheet: "task", data: [data] }),
  });
  if (!res.ok) throw new Error("Failed to post task");
}

async function fetchTasks(): Promise<LiveTask[]> {
  const res = await fetchWithTimeout(`${SHEETDB}?sheet=task`);
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return res.json();
}

async function fetchTaskHistory(): Promise<TaskHistory[]> {
  try {
    const res = await fetchWithTimeout(`${SHEETDB}?sheet=task_history`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function fetchFeedback(): Promise<FeedbackRow[]> {
  try {
    const res = await fetchWithTimeout(`${SHEETDB}?sheet=feedback`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function fetchUserById(userId: string): Promise<UserRow | null> {
  const res = await fetchWithTimeout(
    `${SHEETDB}/search?sheet=users&user_id=${encodeURIComponent(userId)}`,
  );
  if (!res.ok) return null;
  const rows: UserRow[] = await res.json();
  return rows.length > 0 ? rows[0] : null;
}

async function checkUserIdUnique(userId: string): Promise<boolean> {
  const res = await fetchWithTimeout(
    `${SHEETDB}/search?sheet=users&user_id=${encodeURIComponent(userId)}`,
  );
  if (!res.ok) return true;
  const rows: UserRow[] = await res.json();
  return rows.length === 0;
}

async function checkEmailUnique(email: string): Promise<boolean> {
  // On network error, allow submission (don't silently block the user)
  const res = await fetchWithTimeout(
    `${SHEETDB}/search?sheet=users&email_id=${encodeURIComponent(email)}`,
  );
  if (!res.ok) return true;
  const rows: UserRow[] = await res.json();
  return rows.length === 0;
}

async function createUser(data: object) {
  const res = await fetchWithTimeout(SHEETDB, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sheet: "users", data: [data] }),
  });
  if (!res.ok) throw new Error("Failed to create account");
}

async function loginUser(
  userId: string,
  passwordHash: string,
): Promise<UserRow | null> {
  // Fetch by username only, then verify hash client-side
  const res = await fetchWithTimeout(
    `${SHEETDB}/search?sheet=users&user_id=${encodeURIComponent(userId)}`,
  );
  if (!res.ok) return null;
  const rows: UserRow[] = await res.json();
  if (rows.length === 0) return null;
  const user = rows[0];
  // Compare hash client-side for reliability
  if (user.password_hash !== passwordHash) return null;
  return user;
}

async function patchUser(userId: string, data: object) {
  const res = await fetchWithTimeout(
    `${SHEETDB}/user_id/${encodeURIComponent(userId)}?sheet=users`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    },
  );
  if (!res.ok) throw new Error("Failed to update profile");
}

async function patchTask(taskId: string, data: object) {
  const res = await fetchWithTimeout(
    `${SHEETDB}/task_id/${encodeURIComponent(taskId)}?sheet=task`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    },
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Failed to update task: ${res.status} ${errText}`);
  }
}

// ── Design constants ─────────────────────────────────────────────────────────
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

// ── Shared components ─────────────────────────────────────────────────────────
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

const CATEGORY_STYLES: Record<
  string,
  { bg: string; color: string; border: string }
> = {
  Assignment: {
    bg: "oklch(0.22 0.08 250 / 0.35)",
    color: "oklch(0.72 0.16 250)",
    border: "oklch(0.45 0.14 250 / 0.5)",
  },
  "Notes/Books": {
    bg: "oklch(0.22 0.08 155 / 0.35)",
    color: "oklch(0.72 0.16 155)",
    border: "oklch(0.45 0.14 155 / 0.5)",
  },
  "Delivery/Pick-up": {
    bg: "oklch(0.22 0.08 55 / 0.35)",
    color: "oklch(0.78 0.16 55)",
    border: "oklch(0.45 0.14 55 / 0.5)",
  },
  "Tech Support": {
    bg: "oklch(0.22 0.08 200 / 0.35)",
    color: "oklch(0.72 0.16 200)",
    border: "oklch(0.45 0.14 200 / 0.5)",
  },
  "Lab Work": {
    bg: "oklch(0.22 0.08 90 / 0.35)",
    color: "oklch(0.78 0.16 90)",
    border: "oklch(0.45 0.14 90 / 0.5)",
  },
  Other: {
    bg: "oklch(0.22 0.01 265 / 0.35)",
    color: "oklch(0.65 0.01 265)",
    border: "oklch(0.38 0.01 265 / 0.5)",
  },
};

function TaskCardComponent({
  task,
  index,
  currentUserId,
  onOpen,
}: {
  task: LiveTask;
  index: number;
  currentUserId: string | null;
  onOpen: (task: LiveTask) => void;
}) {
  const isMyTask = currentUserId && task.user_id_origintor === currentUserId;
  const catStyle = task.category
    ? (CATEGORY_STYLES[task.category] ?? CATEGORY_STYLES.Other)
    : null;

  return (
    <button
      type="button"
      data-ocid={`tasks.item.${index}`}
      className="card-surface rounded-2xl p-4 flex flex-col gap-3 transition-all duration-300 cursor-pointer hover:border-purple-500/50 w-full text-left"
      onClick={() => onOpen(task)}
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
      {catStyle && task.category ? (
        <span
          className="self-start text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: catStyle.bg,
            color: catStyle.color,
            border: `1px solid ${catStyle.border}`,
          }}
        >
          {task.category}
        </span>
      ) : null}
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
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="text-xs" style={{ color: "oklch(0.55 0.10 295)" }}>
          {isMyTask ? "Your task" : "Tap to view details"}
        </span>
        <ExternalLink
          className="w-3.5 h-3.5"
          style={{ color: "oklch(0.55 0.10 295)" }}
        />
      </div>
    </button>
  );
}

function TaskDetailModal({
  task,
  currentUserId,
  allTasks,
  onClose,
  onTaskUpdate,
}: {
  task: LiveTask;
  currentUserId: string | null;
  allTasks: LiveTask[];
  onClose: () => void;
  onTaskUpdate?: (updatedApplicants: string) => void;
}) {
  const [posterInfo, setPosterInfo] = useState<UserRow | null>(null);
  const [_posterHistory, setPosterHistory] = useState<TaskHistory[]>([]);
  const [modalFeedbackRows, setModalFeedbackRows] = useState<FeedbackRow[]>([]);
  const [posterLoading, setPosterLoading] = useState(true);
  const [requestSent, setRequestSent] = useState(() => {
    if (!currentUserId || !task.applicants) return false;
    // Use contains check: look for user_id anywhere in the applicants string
    const applicantsStr = task.applicants;
    return applicantsStr
      .split(",")
      .map((s) => s.trim())
      .some((id) => id === currentUserId);
  });
  const [requestLoading, setRequestLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const isMyTask = currentUserId && task.user_id_origintor === currentUserId;

  useEffect(() => {
    if (!task.user_id_origintor) {
      setPosterLoading(false);
      return;
    }
    Promise.all([
      fetchUserById(task.user_id_origintor),
      fetchTaskHistory(),
      fetchFeedback(),
    ])
      .then(([user, history, feedback]) => {
        setPosterInfo(user);
        setPosterHistory(
          history.filter(
            (h) =>
              h.user_id_recipient === (user?.user_id ?? task.user_id_origintor),
          ),
        );
        setModalFeedbackRows(feedback);
      })
      .catch(() => {})
      .finally(() => setPosterLoading(false));
  }, [task.user_id_origintor]);

  const posterTasksCount = allTasks.filter(
    (t) => t.user_id_origintor === task.user_id_origintor,
  ).length;

  const ratings = modalFeedbackRows
    .filter(
      (r) =>
        (r.user_id_recipient ===
          (posterInfo?.user_id ?? task.user_id_origintor) ||
          r.worker_id === (posterInfo?.user_id ?? task.user_id_origintor)) &&
        r.rating &&
        !Number.isNaN(Number.parseFloat(r.rating)),
    )
    .map((r) => Number.parseFloat(r.rating));
  const avgRating =
    ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : null;

  function renderStars(rating: number) {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    const starKeys = ["s1", "s2", "s3", "s4", "s5"];
    return (
      <span className="flex items-center gap-0.5">
        {starKeys.map((k, i) => {
          if (i < full)
            return (
              <span key={k} style={{ color: "oklch(0.80 0.15 75)" }}>
                ★
              </span>
            );
          if (i === full && half)
            return (
              <span key={k} style={{ color: "oklch(0.80 0.15 75)" }}>
                ½
              </span>
            );
          return (
            <span key={k} style={{ color: "oklch(0.35 0 0)" }}>
              ★
            </span>
          );
        })}
        <span className="ml-1 text-xs" style={{ color: "oklch(0.70 0 0)" }}>
          ({rating.toFixed(1)})
        </span>
      </span>
    );
  }

  async function handleDiscussChat() {
    setChatLoading(true);
    try {
      let handle = posterInfo?.telegram_id?.replace(/^@/, "");
      if (!handle && task.user_id_origintor) {
        const user = await fetchUserById(task.user_id_origintor);
        handle = user?.telegram_id?.replace(/^@/, "");
      }
      if (handle) {
        const url = `https://t.me/${handle}?text=${encodeURIComponent(`Hi! I am interested in your task: ${task.task_name}`)}`;
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        alert("Poster hasn't added a Telegram ID yet.");
      }
    } finally {
      setChatLoading(false);
    }
  }

  const catStyle = task.category
    ? (CATEGORY_STYLES[task.category] ?? CATEGORY_STYLES.Other)
    : null;

  return (
    <div
      data-ocid="task_detail.modal"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "oklch(0.05 0 0 / 0.88)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        backdropFilter: "blur(6px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        style={{
          background: "oklch(0.11 0.01 265)",
          border: "1px solid oklch(0.28 0.012 265)",
          borderRadius: "1.25rem",
          width: "100%",
          maxWidth: "460px",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 0 40px oklch(0.40 0.22 295 / 0.15)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: "1.25rem 1.25rem 0",
          }}
        >
          <div className="flex-1 pr-3">
            <h2
              className="text-base font-bold leading-snug"
              style={{ color: "oklch(0.95 0 0)" }}
            >
              {task.task_name}
            </h2>
            {catStyle && task.category && (
              <span
                className="inline-block mt-1.5 text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: catStyle.bg,
                  color: catStyle.color,
                  border: `1px solid ${catStyle.border}`,
                }}
              >
                {task.category}
              </span>
            )}
          </div>
          <button
            type="button"
            data-ocid="task_detail.close_button"
            onClick={onClose}
            style={{
              background: "oklch(0.20 0.01 265)",
              border: "1px solid oklch(0.28 0.012 265)",
              color: "oklch(0.70 0 0)",
              borderRadius: "0.5rem",
              padding: "0.25rem 0.5rem",
              cursor: "pointer",
              fontSize: "1rem",
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div
          style={{
            overflowY: "auto",
            padding: "1rem 1.25rem 1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          {/* Task details */}
          <div
            style={{
              background: "oklch(0.14 0.01 265)",
              border: "1px solid oklch(0.22 0.01 265)",
              borderRadius: "0.875rem",
              padding: "0.875rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.625rem",
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-xs font-medium"
                style={{ color: "oklch(0.60 0 0)" }}
              >
                Price
              </span>
              <span
                className="text-sm font-bold px-2.5 py-0.5 rounded-full"
                style={{
                  background: "oklch(0.45 0.22 295 / 0.2)",
                  color: "oklch(0.78 0.20 295)",
                  border: "1px solid oklch(0.50 0.18 295 / 0.4)",
                }}
              >
                ₹{task.price}
              </span>
            </div>
            {task.location && (
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-xs font-medium"
                  style={{ color: "oklch(0.60 0 0)" }}
                >
                  Location
                </span>
                <span className="text-xs" style={{ color: "oklch(0.80 0 0)" }}>
                  <MapPin className="w-3 h-3 inline mr-1" />
                  {task.location}
                </span>
              </div>
            )}
            {task.deadline && (
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-xs font-medium"
                  style={{ color: "oklch(0.60 0 0)" }}
                >
                  Deadline
                </span>
                <span className="text-xs" style={{ color: "oklch(0.80 0 0)" }}>
                  {task.deadline}
                </span>
              </div>
            )}
            {task.Description && (
              <div
                className="flex flex-col gap-1 pt-1"
                style={{ borderTop: "1px solid oklch(0.22 0.01 265)" }}
              >
                <span
                  className="text-xs font-medium"
                  style={{ color: "oklch(0.60 0 0)" }}
                >
                  Description
                </span>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "oklch(0.78 0 0)" }}
                >
                  {task.Description}
                </p>
              </div>
            )}
          </div>

          {/* Poster profile */}
          <div
            style={{
              background: "oklch(0.14 0.01 265)",
              border: "1px solid oklch(0.22 0.01 265)",
              borderRadius: "0.875rem",
              padding: "0.875rem",
            }}
          >
            <p
              className="text-xs font-semibold mb-3"
              style={{
                color: "oklch(0.55 0.10 295)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Poster Profile
            </p>
            {posterLoading ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2
                  className="w-4 h-4 animate-spin"
                  style={{ color: "oklch(0.55 0.10 295)" }}
                />
                <span className="text-xs" style={{ color: "oklch(0.55 0 0)" }}>
                  Loading poster info...
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{
                    background: "oklch(0.45 0.22 295 / 0.25)",
                    color: "oklch(0.78 0.20 295)",
                    border: "1px solid oklch(0.50 0.18 295 / 0.35)",
                  }}
                >
                  {posterInfo?.full_name?.charAt(0)?.toUpperCase() ??
                    task.user_id_origintor?.charAt(0)?.toUpperCase() ??
                    "?"}
                </div>
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span
                    className="text-sm font-semibold truncate"
                    style={{ color: "oklch(0.92 0 0)" }}
                  >
                    {posterInfo?.full_name ??
                      task.user_id_origintor ??
                      "Unknown"}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: "oklch(0.55 0 0)" }}
                  >
                    @{posterInfo?.user_id ?? task.user_id_origintor}
                  </span>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span
                      className="text-xs"
                      style={{ color: "oklch(0.60 0 0)" }}
                    >
                      {avgRating !== null ? (
                        renderStars(avgRating)
                      ) : (
                        <span>Unrated</span>
                      )}
                    </span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        background: "oklch(0.20 0.01 265)",
                        color: "oklch(0.65 0 0)",
                      }}
                    >
                      {posterTasksCount} task{posterTasksCount !== 1 ? "s" : ""}{" "}
                      posted
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          {isMyTask ? (
            <div
              className="text-center text-xs py-2 rounded-xl"
              style={{
                background: "oklch(0.17 0.01 265)",
                color: "oklch(0.50 0 0)",
                border: "1px solid oklch(0.24 0.01 265)",
              }}
            >
              This is your task
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                data-ocid="task_detail.primary_button"
                disabled={requestLoading}
                onClick={async () => {
                  if (!currentUserId) return;
                  // Optimistic UI update immediately — button flips before API call
                  const prevSent = requestSent;
                  setRequestSent(!prevSent);
                  setRequestLoading(true);
                  try {
                    const existing = (task.applicants ?? "").trim();
                    let newApplicants: string;
                    if (!prevSent) {
                      // ADD: use contains check to avoid duplicates
                      const alreadyIn = existing
                        .split(",")
                        .map((s) => s.trim())
                        .some((id) => id === currentUserId);
                      if (!alreadyIn) {
                        // Append with comma separator; if empty just set the id
                        newApplicants = existing
                          ? `${existing},${currentUserId}`
                          : currentUserId;
                      } else {
                        newApplicants = existing;
                      }
                    } else {
                      // REMOVE: filter out only this user's ID, then clean dangling commas
                      const ids = existing
                        .split(",")
                        .map((s) => s.trim())
                        .filter((id) => id !== currentUserId && id !== "");
                      newApplicants = ids.join(",");
                    }
                    await patchTask(task.task_id, {
                      applicants: newApplicants,
                    });
                    task.applicants = newApplicants;
                    // Propagate update to parent so poster's view refreshes silently
                    onTaskUpdate?.(newApplicants);
                    toast("Request Updated!");
                  } catch (e) {
                    // Revert optimistic update on failure
                    setRequestSent(prevSent);
                    console.error("Send request error:", e);
                    const msg = e instanceof Error ? e.message : String(e);
                    toast(
                      msg.includes("column") ||
                        msg.includes("404") ||
                        msg.includes("not found")
                        ? "Sheet column 'applicants' missing. Add it to your task tab."
                        : "Failed to update request. Please try again.",
                    );
                  } finally {
                    setRequestLoading(false);
                  }
                }}
                style={
                  requestSent
                    ? {
                        width: "100%",
                        padding: "0.625rem 1rem",
                        borderRadius: "0.75rem",
                        border: "1px solid oklch(0.35 0.10 155 / 0.5)",
                        cursor: "pointer",
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                        transition: "all 0.2s",
                        background: "oklch(0.20 0.04 155)",
                        color: "oklch(0.72 0.16 155)",
                      }
                    : {
                        width: "100%",
                        padding: "0.625rem 1rem",
                        borderRadius: "0.75rem",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                        transition: "all 0.2s",
                        background:
                          "linear-gradient(135deg, oklch(0.55 0.22 295), oklch(0.50 0.24 310))",
                        color: "#fff",
                        boxShadow: "0 0 20px oklch(0.45 0.22 295 / 0.35)",
                      }
                }
              >
                {requestLoading ? (
                  <span style={{ opacity: 0.7 }}>Sending...</span>
                ) : requestSent ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Request Sent ✓
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Request
                  </>
                )}
              </button>
              <button
                type="button"
                data-ocid="task_detail.secondary_button"
                onClick={handleDiscussChat}
                disabled={chatLoading}
                style={{
                  width: "100%",
                  padding: "0.625rem 1rem",
                  borderRadius: "0.75rem",
                  background: "transparent",
                  border: "1px solid oklch(0.45 0.15 295 / 0.5)",
                  color: "oklch(0.72 0.15 295)",
                  cursor: "pointer",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  transition: "all 0.2s",
                  opacity: chatLoading ? 0.6 : 1,
                }}
              >
                {chatLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MessageCircle className="w-4 h-4" />
                )}
                Discuss on Chat
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
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

// ── Welcome Screen ────────────────────────────────────────────────────────────
function CreateAccountForm({ onAuth }: { onAuth: (userId: string) => void }) {
  const [fields, setFields] = useState({
    fullName: "",
    username: "",
    gmail: "",
    phone: "",
    telegram: "",
    upiId: "",
    upiPlatform: "",
    studentId: "",
    password: "",
  });
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
    setStatus("idle");
    setErrorMsg("");
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  function handleAutoGenerate() {
    const firstName =
      fields.fullName.trim().split(/\s+/)[0]?.toLowerCase() || "user";
    const digits = Math.floor(100 + Math.random() * 900);
    setFields((prev) => ({ ...prev, username: `${firstName}_${digits}` }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");
    try {
      const isEmailUnique = await checkEmailUnique(fields.gmail);
      if (!isEmailUnique) {
        setErrorMsg("An account with this Gmail already exists.");
        setStatus("error");
        return;
      }
      const isUnique = await checkUserIdUnique(fields.username);
      if (!isUnique) {
        setErrorMsg("Username already taken. Try another.");
        setStatus("error");
        return;
      }
      await createUser({
        user_id: fields.username,
        full_name: fields.fullName,
        email_id: fields.gmail,
        phone_number: fields.phone,
        telegram_id: fields.telegram.replace(/^@/, ""),
        upi_id: fields.upiId,
        upi_type: fields.upiPlatform,
        student_id: fields.studentId,
        password_hash: fields.password,
      });
      localStorage.setItem("proxii_user_id", fields.username);
      onAuth(fields.username);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMsg && (
        <div
          data-ocid="create_account.error_state"
          className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium"
          style={{
            background: "oklch(0.25 0.08 25 / 0.3)",
            border: "1px solid oklch(0.45 0.15 25 / 0.5)",
            color: "oklch(0.75 0.18 25)",
          }}
        >
          <XCircle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <Label
          htmlFor="ca-fullName"
          className="text-sm font-medium text-muted-foreground"
        >
          Full Name <span style={{ color: "oklch(0.65 0.22 15)" }}>*</span>
        </Label>
        <StyledInput
          id="ca-fullName"
          name="fullName"
          type="text"
          data-ocid="create_account.input"
          placeholder="e.g. Ariba Khan"
          value={fields.fullName}
          onChange={handleChange}
          required
          autoComplete="name"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label
          htmlFor="ca-username"
          className="text-sm font-medium text-muted-foreground"
        >
          Username <span style={{ color: "oklch(0.65 0.22 15)" }}>*</span>
        </Label>
        <div className="flex gap-2">
          <StyledInput
            id="ca-username"
            name="username"
            type="text"
            data-ocid="create_account.input"
            placeholder="e.g. ariba_847"
            value={fields.username}
            onChange={handleChange}
            required
            autoComplete="username"
            style={{ flex: 1 }}
          />
          <button
            type="button"
            data-ocid="create_account.secondary_button"
            onClick={handleAutoGenerate}
            className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: "oklch(0.45 0.22 295 / 0.15)",
              border: "1px solid oklch(0.50 0.18 295 / 0.4)",
              color: "oklch(0.78 0.20 295)",
              cursor: "pointer",
            }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Click the icon to auto-generate from your name
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <Label
          htmlFor="ca-gmail"
          className="text-sm font-medium text-muted-foreground"
        >
          Gmail ID <span style={{ color: "oklch(0.65 0.22 15)" }}>*</span>
        </Label>
        <StyledInput
          id="ca-gmail"
          name="gmail"
          type="email"
          data-ocid="create_account.input"
          placeholder="e.g. ariba@gmail.com"
          value={fields.gmail}
          onChange={handleChange}
          required
          autoComplete="email"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label
          htmlFor="ca-phone"
          className="text-sm font-medium text-muted-foreground"
        >
          Phone Number <span style={{ color: "oklch(0.65 0.22 15)" }}>*</span>
        </Label>
        <StyledInput
          id="ca-phone"
          name="phone"
          type="tel"
          data-ocid="create_account.input"
          placeholder="e.g. 9876543210"
          value={fields.phone}
          onChange={handleChange}
          required
          autoComplete="tel"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label
          htmlFor="ca-telegram"
          className="text-sm font-medium text-muted-foreground"
        >
          Telegram ID
        </Label>
        <StyledInput
          id="ca-telegram"
          name="telegram"
          type="text"
          data-ocid="create_account.input"
          placeholder="e.g. ariba_khan (without @)"
          value={fields.telegram}
          onChange={handleChange}
        />
        <p className="text-xs text-muted-foreground mt-0.5">
          To contact your peer
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <Label
          htmlFor="ca-upiId"
          className="text-sm font-medium text-muted-foreground"
        >
          UPI ID
        </Label>
        <StyledInput
          id="ca-upiId"
          name="upiId"
          type="text"
          data-ocid="create_account.input"
          placeholder="e.g. ariba@upi"
          value={fields.upiId}
          onChange={handleChange}
        />
        <p className="text-xs text-muted-foreground mt-0.5">
          Where you'll be credited for helping your peer
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <Label
          htmlFor="ca-upiPlatform"
          className="text-sm font-medium text-muted-foreground"
        >
          UPI Platform
        </Label>
        <select
          id="ca-upiPlatform"
          name="upiPlatform"
          data-ocid="create_account.select"
          value={fields.upiPlatform}
          onChange={handleChange}
          style={{
            background: "oklch(0.16 0.02 265 / 0.8)",
            border: "1px solid oklch(0.30 0.05 265 / 0.5)",
            color: fields.upiPlatform
              ? "oklch(0.85 0.04 265)"
              : "oklch(0.55 0.04 265)",
            borderRadius: "0.75rem",
            height: "2.75rem",
            padding: "0 1rem",
            width: "100%",
            fontSize: "0.875rem",
            appearance: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a0a0c0' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 1rem center",
            cursor: "pointer",
          }}
        >
          <option value="">Select your UPI app</option>
          <option value="gpay">Google Pay (GPay)</option>
          <option value="phonepe">PhonePe</option>
          <option value="paytm">Paytm</option>
          <option value="amazonpay">Amazon Pay</option>
          <option value="bhim">BHIM</option>
          <option value="cred">CRED</option>
          <option value="growwpay">Groww Pay</option>
          <option value="navi">Navi</option>
          <option value="mobikwik">MobiKwik</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <Label
          htmlFor="ca-studentId"
          className="text-sm font-medium text-muted-foreground"
        >
          Student ID
        </Label>
        <StyledInput
          id="ca-studentId"
          name="studentId"
          type="text"
          data-ocid="create_account.input"
          placeholder="e.g. 22BCS1234"
          value={fields.studentId}
          onChange={handleChange}
        />
        <p className="text-xs text-muted-foreground mt-0.5">
          Your college unique ID
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <Label
          htmlFor="ca-password"
          className="text-sm font-medium text-muted-foreground"
        >
          Password <span style={{ color: "oklch(0.65 0.22 15)" }}>*</span>
        </Label>
        <StyledInput
          id="ca-password"
          name="password"
          type="password"
          data-ocid="create_account.input"
          placeholder="Choose a strong password"
          value={fields.password}
          onChange={handleChange}
          required
          autoComplete="new-password"
        />
      </div>

      <Button
        type="submit"
        data-ocid="create_account.submit_button"
        disabled={status === "sending"}
        className="w-full glow-button purple-gradient border-0 text-white font-semibold rounded-xl h-11 mt-2"
      >
        {status === "sending" ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating Account...
          </>
        ) : (
          "Create Account"
        )}
      </Button>
    </form>
  );
}

function LoginForm({ onAuth }: { onAuth: (userId: string) => void }) {
  const [fields, setFields] = useState({ username: "", password: "" });
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setStatus("idle");
    setErrorMsg("");
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");
    try {
      const user = await loginUser(fields.username, fields.password);
      if (!user) {
        setErrorMsg("Invalid username or password.");
        setStatus("error");
        return;
      }
      localStorage.setItem("proxii_user_id", user.user_id);
      onAuth(user.user_id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMsg && (
        <div
          data-ocid="login.error_state"
          className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium"
          style={{
            background: "oklch(0.25 0.08 25 / 0.3)",
            border: "1px solid oklch(0.45 0.15 25 / 0.5)",
            color: "oklch(0.75 0.18 25)",
          }}
        >
          <XCircle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <Label
          htmlFor="login-username"
          className="text-sm font-medium text-muted-foreground"
        >
          Username <span style={{ color: "oklch(0.65 0.22 15)" }}>*</span>
        </Label>
        <StyledInput
          id="login-username"
          name="username"
          type="text"
          data-ocid="login.input"
          placeholder="Your username"
          value={fields.username}
          onChange={handleChange}
          required
          autoComplete="username"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label
          htmlFor="login-password"
          className="text-sm font-medium text-muted-foreground"
        >
          Password <span style={{ color: "oklch(0.65 0.22 15)" }}>*</span>
        </Label>
        <StyledInput
          id="login-password"
          name="password"
          type="password"
          data-ocid="login.input"
          placeholder="Your password"
          value={fields.password}
          onChange={handleChange}
          required
          autoComplete="current-password"
        />
      </div>

      <Button
        type="submit"
        data-ocid="login.submit_button"
        disabled={status === "sending"}
        className="w-full glow-button purple-gradient border-0 text-white font-semibold rounded-xl h-11 mt-2"
      >
        {status === "sending" ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Logging in...
          </>
        ) : (
          "Login"
        )}
      </Button>
    </form>
  );
}

function WelcomeScreen({ onAuth }: { onAuth: (userId: string) => void }) {
  const [view, setView] = useState<AuthView>("login");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative z-10">
      {/* Glow orb */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, oklch(0.45 0.22 295 / 0.12) 0%, transparent 70%)",
        }}
      />

      <div
        className="w-full max-w-sm rounded-3xl p-8 relative"
        style={{
          background: "oklch(0.12 0.01 265 / 0.95)",
          border: "1px solid oklch(0.28 0.015 295 / 0.5)",
          boxShadow:
            "0 0 60px -12px oklch(0.45 0.22 295 / 0.25), 0 25px 50px -12px oklch(0 0 0 / 0.5)",
        }}
      >
        {/* Branding */}
        <div className="text-center mb-8">
          <div
            className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-4"
            style={{
              background: "oklch(0.45 0.22 295 / 0.18)",
              border: "1px solid oklch(0.55 0.22 295 / 0.3)",
            }}
          >
            <MapPinned
              className="w-7 h-7"
              style={{ color: "oklch(0.75 0.22 295)" }}
            />
          </div>
          <h1 className="text-2xl font-extrabold purple-gradient-text tracking-tight">
            Proxii Hub
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Your campus marketplace
          </p>
        </div>

        {/* Toggle tabs */}
        <div
          className="flex rounded-xl p-1 mb-6 gap-1"
          style={{ background: "oklch(0.18 0.01 265)" }}
        >
          {(["login", "create"] as AuthView[]).map((v) => (
            <button
              key={v}
              type="button"
              data-ocid={`welcome.${v}.tab`}
              onClick={() => setView(v)}
              className="flex-1 py-2 text-sm font-semibold rounded-lg transition-all"
              style={{
                background:
                  view === v ? "oklch(0.45 0.22 295 / 0.25)" : "transparent",
                color: view === v ? "oklch(0.82 0.20 295)" : "oklch(0.55 0 0)",
                border:
                  view === v
                    ? "1px solid oklch(0.50 0.18 295 / 0.4)"
                    : "1px solid transparent",
              }}
            >
              {v === "login" ? "Login" : "Create Account"}
            </button>
          ))}
        </div>

        {view === "login" ? (
          <LoginForm onAuth={onAuth} />
        ) : (
          <CreateAccountForm onAuth={onAuth} />
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-6 text-center">
        Campus-only marketplace · Private by design
      </p>
    </div>
  );
}

// ── Post Task Screen ──────────────────────────────────────────────────────────
function PostTaskScreen({
  onGoToExplore,
  onTaskPosted,
}: { onGoToExplore: () => void; onTaskPosted?: (task: LiveTask) => void }) {
  const emptyPost = {
    title: "",
    category: "",
    price: "",
    location: "",
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
      const userId = localStorage.getItem("proxii_user_id") ?? "";
      const randStr = Math.random().toString(36).slice(2, 7);
      await postTask({
        task_id: `task_${randStr}`,
        user_id_origintor: userId,
        task_name: fields.title,
        price: fields.price,
        status: "active",
        deadline: fields.deadline,
        location: fields.location,
        Description: fields.description,
        category: fields.category,
      });
      const newTask: LiveTask = {
        task_id: `task_${randStr}`,
        task_name: fields.title,
        price: fields.price,
        location: fields.location,
        Description: fields.description,
        telegram_id: "",
        status: "active",
        deadline: fields.deadline,
        category: fields.category,
        user_id_origintor: userId,
      };
      onTaskPosted?.(newTask);
      setLastTask(fields);
      setStatus("success");
      setTimeout(() => {
        onGoToExplore();
      }, 2000);
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
            Task Live! 🎉
          </h2>
          <p className="text-muted-foreground text-sm text-center">
            <span className="font-semibold text-foreground">
              &ldquo;{lastTask.title}&rdquo;
            </span>{" "}
            has been posted. Redirecting you to Explore...
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
              htmlFor="post-category"
              className="text-sm font-medium text-muted-foreground"
            >
              Task Category{" "}
              <span style={{ color: "oklch(0.65 0.22 15)" }}>*</span>
            </Label>
            <select
              id="post-category"
              name="category"
              data-ocid="post_task.select"
              value={fields.category}
              onChange={(e) => {
                setStatus("idle");
                setFields((prev) => ({ ...prev, category: e.target.value }));
              }}
              required
              style={{
                background: "oklch(0.14 0.01 265)",
                border: "1.5px solid oklch(0.50 0.18 295 / 0.5)",
                borderRadius: "0.75rem",
                color: fields.category ? "oklch(0.95 0 0)" : "oklch(0.55 0 0)",
                padding: "0.6rem 1rem",
                fontSize: "0.875rem",
                width: "100%",
                outline: "none",
                appearance: "auto",
              }}
            >
              <option value="" disabled>
                Select a category...
              </option>
              <option value="Assignment">Assignment</option>
              <option value="Notes/Books">Notes/Books</option>
              <option value="Delivery/Pick-up">Delivery/Pick-up</option>
              <option value="Tech Support">Tech Support</option>
              <option value="Lab Work">Lab Work</option>
              <option value="Other">Other</option>
            </select>
          </div>
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

// ── Profile Screen ────────────────────────────────────────────────────────────

function PostedTaskCard({ task, index }: { task: LiveTask; index: number }) {
  const [selectedPerformer, setSelectedPerformer] = useState<string | null>(
    null,
  );
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const applicantList = task.applicants
    ? task.applicants
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  async function handleSelect(applicantId: string) {
    setSelectingId(applicantId);
    try {
      await patchTask(task.task_id, {
        user_id_recipient: applicantId,
        status: "Awaiting Payment",
      });
      setSuccessId(applicantId);
      setSelectedPerformer(applicantId);
    } catch {
      // ignore
    } finally {
      setSelectingId(null);
    }
  }

  return (
    <div
      data-ocid={`profile.posted.item.${index + 1}`}
      className="rounded-xl p-3 space-y-2"
      style={{
        background: "oklch(0.18 0.01 265)",
        border: "1px solid oklch(0.28 0.012 265)",
      }}
    >
      <div className="flex justify-between">
        <span className="text-sm font-semibold text-foreground">
          {task.task_name}
        </span>
        <span
          className="text-xs font-bold"
          style={{ color: "oklch(0.78 0.20 295)" }}
        >
          ₹{task.price}
        </span>
      </div>
      <span
        className="text-xs px-2 py-0.5 rounded-full inline-block"
        style={{
          background: "oklch(0.22 0.05 265 / 0.4)",
          color: "oklch(0.70 0.05 265)",
        }}
      >
        {task.status || "Active"}
      </span>

      {/* Applicants section */}
      <div className="pt-1">
        <span
          className="text-xs font-semibold"
          style={{ color: "oklch(0.60 0.10 295)" }}
        >
          Applicants
        </span>
        {applicantList.length === 0 ? (
          <p className="text-xs text-muted-foreground mt-1">
            No applicants yet
          </p>
        ) : (
          <div className="flex flex-col gap-1.5 mt-1.5">
            {applicantList.map((applicantId) => (
              <div
                key={applicantId}
                className="flex items-center justify-between rounded-lg px-2 py-1.5"
                style={{
                  background: "oklch(0.15 0.01 265)",
                  border: "1px solid oklch(0.26 0.012 265)",
                }}
              >
                <span
                  className="text-xs font-medium"
                  style={{ color: "oklch(0.72 0.15 295)" }}
                >
                  @{applicantId}
                </span>
                {successId === applicantId ||
                selectedPerformer === applicantId ||
                task.user_id_recipient === applicantId ? (
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{
                      color: "oklch(0.72 0.18 150)",
                      background: "oklch(0.18 0.05 150 / 0.3)",
                    }}
                  >
                    ✓ Selected
                  </span>
                ) : acceptingId === applicantId ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAcceptingId(null)}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        color: "oklch(0.55 0 0)",
                        background: "transparent",
                        border: "1px solid oklch(0.30 0 0)",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={selectingId === applicantId}
                      onClick={() => handleSelect(applicantId)}
                      className="text-xs px-2 py-0.5 rounded-full transition-all"
                      style={{
                        border: "1px solid oklch(0.45 0.18 145 / 0.7)",
                        color: "oklch(0.72 0.18 145)",
                        background: "oklch(0.18 0.05 145 / 0.2)",
                        cursor:
                          selectingId === applicantId
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {selectingId === applicantId
                        ? "Confirming..."
                        : "✓ Confirm"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!!task.user_id_recipient || !!selectedPerformer}
                    onClick={() => setAcceptingId(applicantId)}
                    className="text-xs px-2 py-0.5 rounded-full transition-all"
                    style={{
                      border: "1px solid oklch(0.45 0.18 295 / 0.6)",
                      color: "oklch(0.72 0.15 295)",
                      background: "transparent",
                      cursor:
                        !!task.user_id_recipient || !!selectedPerformer
                          ? "not-allowed"
                          : "pointer",
                      opacity:
                        !!task.user_id_recipient || !!selectedPerformer
                          ? 0.4
                          : 1,
                    }}
                  >
                    Accept
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileScreen({
  userId,
  onLogout,
  onGoToExplore,
  onGoToPost,
}: {
  userId: string;
  onLogout: () => void;
  onGoToExplore: () => void;
  onGoToPost: () => void;
}) {
  const [userRow, setUserRow] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editFields, setEditFields] = useState({
    fullName: "",
    telegram: "",
    phone: "",
    upiId: "",
    collegeId: "",
  });
  const [saveStatus, setSaveStatus] = useState<Status>("idle");
  const [saveError, setSaveError] = useState("");
  const cachedRef = useRef<UserRow | null>(null);
  const [taskHistory, setTaskHistory] = useState<TaskHistory[]>([]);
  const [allTasks, setAllTasks] = useState<LiveTask[]>([]);
  const [feedbackRows, setFeedbackRows] = useState<FeedbackRow[]>([]);
  const [activeModal, setActiveModal] = useState<
    "posted" | "completed" | "earned" | null
  >(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    // Use cached data if available
    if (cachedRef.current) {
      setUserRow(cachedRef.current);
      setLoading(false);
      return;
    }
    fetchUserById(userId)
      .then((row) => {
        if (!row) {
          // If user not found (shouldn't happen after login), log out
          onLogout();
          return;
        }
        cachedRef.current = row;
        setUserRow(row);
      })
      .catch(() => setFetchError("Failed to load profile. Please try again."))
      .finally(() => setLoading(false));
  }, [userId, onLogout]);

  useEffect(() => {
    if (!userId) return;
    setStatsLoading(true);
    Promise.all([fetchTasks(), fetchTaskHistory(), fetchFeedback()])
      .then(([tasks, history, feedback]) => {
        setAllTasks(tasks);
        setTaskHistory(history);
        setFeedbackRows(feedback);
      })
      .finally(() => setStatsLoading(false));
  }, [userId]);

  function isProfileComplete(row: UserRow) {
    return !!(row.telegram_id || row.phone_number);
  }

  function startEdit(row: UserRow) {
    setEditFields({
      fullName: row.full_name || "",
      telegram: row.telegram_id || "",
      phone: row.phone_number || "",
      upiId: row.upi_id || "",
      collegeId: row.student_id || "",
    });
    setIsEditing(true);
    setSaveStatus("idle");
    setSaveError("");
  }

  function handleEditChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setEditFields((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaveStatus("sending");
    setSaveError("");
    try {
      const data = {
        full_name: editFields.fullName,
        telegram_id: editFields.telegram.replace(/^@/, ""),
        phone_number: editFields.phone,
        upi_id: editFields.upiId,
        student_id: editFields.collegeId,
      };
      await patchUser(userId, data);
      const updated: UserRow = {
        ...(userRow as UserRow),
        ...data,
      };
      cachedRef.current = updated;
      setUserRow(updated);
      setIsEditing(false);
      setSaveStatus("idle");
      // Redirect to explore after saving profile for first time
      if (userRow && !isProfileComplete(userRow)) {
        onGoToExplore();
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong");
      setSaveStatus("error");
    }
  }

  const postedTasks = [
    ...allTasks.filter((t) => t.user_id_origintor === userId),
    ...taskHistory.filter((t) => t.user_id_origintor === userId),
  ];
  const postedTasksDeduped = Array.from(
    new Map(postedTasks.map((t) => [t.task_id, t])).values(),
  );

  const completedTasks = taskHistory.filter(
    (t) => t.user_id_recipient === userId,
  );
  const paidOutTasks = taskHistory.filter(
    (t) => t.user_id_recipient === userId && t.payment_status === "Paid Out",
  );
  const totalEarned = paidOutTasks.reduce(
    (sum, t) => sum + (Number.parseFloat(t.price) || 0),
    0,
  );

  const ratings = feedbackRows
    .filter(
      (r) =>
        (r.user_id_recipient === userId || r.worker_id === userId) &&
        r.rating &&
        !Number.isNaN(Number.parseFloat(r.rating)),
    )
    .map((r) => Number.parseFloat(r.rating));
  const avgRating =
    ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : null;

  function renderStars(rating: number): string {
    const full = Math.floor(rating);
    const half = rating - full >= 0.25 ? 1 : 0;
    return `${"⭐".repeat(full)}${half ? "✨" : ""} ${rating.toFixed(1)}`;
  }

  const modalOverlay: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 100,
    background: "oklch(0.05 0 0 / 0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
  };
  const modalCard: React.CSSProperties = {
    background: "oklch(0.14 0.01 265)",
    border: "1px solid oklch(0.28 0.012 265)",
    borderRadius: "1.25rem",
    padding: "1.5rem",
    width: "100%",
    maxWidth: "420px",
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  };

  const displayName = userRow?.full_name || "";
  const initials = displayName
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0].toUpperCase())
    .join("");

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div
          data-ocid="profile.loading_state"
          className="flex flex-col items-center gap-3"
        >
          <Loader2
            className="w-8 h-8 animate-spin"
            style={{ color: "oklch(0.70 0.22 295)" }}
          />
          <p className="text-sm text-muted-foreground">
            Loading your profile...
          </p>
        </div>
      </main>
    );
  }

  if (fetchError) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div data-ocid="profile.error_state" className="text-center">
          <XCircle
            className="w-10 h-10 mx-auto mb-3"
            style={{ color: "oklch(0.65 0.18 25)" }}
          />
          <p className="text-sm text-muted-foreground">{fetchError}</p>
        </div>
      </main>
    );
  }

  const profileComplete = userRow ? isProfileComplete(userRow) : false;

  return (
    <main className="flex-1 px-4 py-8 pb-32">
      <div className="max-w-md mx-auto">
        {/* Header row with logout */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {profileComplete && !isEditing ? (
              <Lock
                className="w-4 h-4"
                style={{ color: "oklch(0.60 0.22 295)" }}
              />
            ) : null}
            <span className="text-xs text-muted-foreground font-medium">
              {profileComplete && !isEditing ? `@${userId}` : "Your Profile"}
            </span>
          </div>
          <button
            type="button"
            data-ocid="profile.close_button"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={{
              background: "oklch(0.22 0.01 265)",
              border: "1px solid oklch(0.30 0.012 265)",
              color: "oklch(0.65 0 0)",
            }}
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>

        {/* Avatar */}
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
          <h2 className="text-2xl font-bold">{displayName || userId}</h2>
          {profileComplete && (
            <span
              className="inline-flex items-center gap-1 mt-2 px-3 py-0.5 rounded-full text-xs font-medium"
              style={{
                background: "oklch(0.35 0.12 145 / 0.2)",
                border: "1px solid oklch(0.45 0.15 145 / 0.4)",
                color: "oklch(0.68 0.18 145)",
              }}
            >
              <CheckCircle2 className="w-3 h-3" /> Profile Complete
            </span>
          )}
        </div>

        {/* Display view or edit form */}
        {profileComplete && !isEditing ? (
          // ── Read-only display ──────────────────────────────────────────────
          <div className="space-y-4">
            {/* Section 1: Public Info */}
            <div
              data-ocid="profile.card"
              className="rounded-2xl p-6 space-y-4"
              style={{
                background: "oklch(0.14 0.01 265 / 0.8)",
                border: "1px solid oklch(0.24 0.012 265)",
              }}
            >
              <p
                className="text-xs uppercase tracking-widest font-semibold mb-2"
                style={{ color: "oklch(0.60 0.18 295)" }}
              >
                Public Info
              </p>
              <div
                style={{ height: "1px", background: "oklch(0.25 0.012 265)" }}
              />
              {[
                { label: "FULL NAME", value: userRow?.full_name || "—" },
                { label: "USERNAME", value: `@${userId}` },
                {
                  label: "TELEGRAM",
                  value: userRow?.telegram_id ? `@${userRow.telegram_id}` : "—",
                },
                { label: "STUDENT ID", value: userRow?.student_id || "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">
                    {label}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {value}
                  </span>
                  <div
                    style={{
                      height: "1px",
                      background: "oklch(0.22 0.01 265)",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Section 2: Payment & Contact */}
            <div
              className="rounded-2xl p-6 space-y-4"
              style={{
                background: "oklch(0.14 0.01 265 / 0.8)",
                border: "1px solid oklch(0.24 0.012 265)",
              }}
            >
              <p
                className="text-xs uppercase tracking-widest font-semibold mb-2"
                style={{ color: "oklch(0.60 0.18 295)" }}
              >
                Payment & Contact
              </p>
              <div
                style={{ height: "1px", background: "oklch(0.25 0.012 265)" }}
              />
              {[
                { label: "PHONE NUMBER", value: userRow?.phone_number || "—" },
                { label: "UPI ID", value: userRow?.upi_id || "—" },
                { label: "UPI TYPE", value: userRow?.upi_type || "—" },
                { label: "GMAIL", value: userRow?.email_id || "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">
                    {label}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {value}
                  </span>
                  <div
                    style={{
                      height: "1px",
                      background: "oklch(0.22 0.01 265)",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Edit Profile button */}
            <Button
              type="button"
              data-ocid="profile.edit_button"
              onClick={() => userRow && startEdit(userRow)}
              className="w-full glow-button border-0 text-white font-semibold rounded-xl h-11"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.45 0.22 295), oklch(0.70 0.25 295))",
              }}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>

            {/* Navigation buttons */}
            <div className="flex gap-3">
              <Button
                type="button"
                data-ocid="profile.secondary_button"
                onClick={onGoToExplore}
                className="flex-1 rounded-xl h-11 text-sm font-semibold border"
                style={{
                  background: "oklch(0.18 0.01 265)",
                  border: "1px solid oklch(0.30 0.012 265)",
                  color: "oklch(0.70 0 0)",
                }}
              >
                <Compass className="w-4 h-4 mr-1.5" />
                Go to Hub
              </Button>
              <Button
                type="button"
                data-ocid="profile.secondary_button"
                onClick={onGoToPost}
                className="flex-1 rounded-xl h-11 text-sm font-semibold border"
                style={{
                  background: "oklch(0.18 0.01 265)",
                  border: "1px solid oklch(0.30 0.012 265)",
                  color: "oklch(0.70 0 0)",
                }}
              >
                <PlusCircle className="w-4 h-4 mr-1.5" />
                Post a Task
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSaveProfile}
            data-ocid="profile.panel"
            className="rounded-2xl p-6 space-y-5"
            style={{
              background: "oklch(0.14 0.01 265 / 0.8)",
              border: "1px solid oklch(0.24 0.012 265)",
            }}
          >
            {!profileComplete && (
              <p className="text-sm text-muted-foreground text-center -mt-1 mb-2">
                Fill in your details to start posting and completing tasks.
              </p>
            )}

            {saveError && (
              <div
                data-ocid="profile.error_state"
                className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium"
                style={{
                  background: "oklch(0.25 0.08 25 / 0.3)",
                  border: "1px solid oklch(0.45 0.15 25 / 0.5)",
                  color: "oklch(0.75 0.18 25)",
                }}
              >
                <XCircle className="w-4 h-4 shrink-0" />
                {saveError}
              </div>
            )}

            <div className="flex flex-col gap-1">
              <Label
                htmlFor="prof-fullName"
                className="text-sm font-medium text-muted-foreground"
              >
                Full Name{" "}
                <span style={{ color: "oklch(0.65 0.22 15)" }}>*</span>
              </Label>
              <StyledInput
                id="prof-fullName"
                name="fullName"
                type="text"
                data-ocid="profile.input"
                placeholder="e.g. Arjun Mehta"
                value={editFields.fullName}
                onChange={handleEditChange}
                required
                autoComplete="name"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label
                htmlFor="prof-telegram"
                className="text-sm font-medium text-muted-foreground"
              >
                Telegram Username{" "}
                <span style={{ color: "oklch(0.65 0.22 15)" }}>*</span>
              </Label>
              <StyledInput
                id="prof-telegram"
                name="telegram"
                type="text"
                data-ocid="profile.input"
                placeholder="e.g. arjunmehta"
                value={editFields.telegram}
                onChange={handleEditChange}
                autoComplete="username"
              />
              <p className="text-xs text-muted-foreground mt-1">
                No @ symbol needed
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <Label
                htmlFor="prof-phone"
                className="text-sm font-medium text-muted-foreground"
              >
                Phone Number{" "}
                <span style={{ color: "oklch(0.65 0.22 15)" }}>*</span>
              </Label>
              <StyledInput
                id="prof-phone"
                name="phone"
                type="tel"
                data-ocid="profile.input"
                placeholder="e.g. 9876543210"
                value={editFields.phone}
                onChange={handleEditChange}
                autoComplete="tel"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label
                htmlFor="prof-upiId"
                className="text-sm font-medium text-muted-foreground"
              >
                UPI ID
              </Label>
              <StyledInput
                id="prof-upiId"
                name="upiId"
                type="text"
                data-ocid="profile.input"
                placeholder="name@okicici"
                value={editFields.upiId}
                onChange={handleEditChange}
                autoComplete="off"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label
                htmlFor="prof-collegeId"
                className="text-sm font-medium text-muted-foreground"
              >
                College / Student ID
              </Label>
              <StyledInput
                id="prof-collegeId"
                name="collegeId"
                type="text"
                data-ocid="profile.input"
                placeholder="e.g. CS21B042"
                value={editFields.collegeId}
                onChange={handleEditChange}
                autoComplete="off"
              />
            </div>

            <div className="flex gap-3">
              {isEditing && (
                <Button
                  type="button"
                  data-ocid="profile.cancel_button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 border text-sm font-semibold rounded-xl h-11"
                  style={{
                    background: "oklch(0.20 0.01 265)",
                    border: "1px solid oklch(0.30 0.012 265)",
                    color: "oklch(0.65 0 0)",
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                data-ocid="profile.submit_button"
                disabled={saveStatus === "sending"}
                className="flex-1 glow-button purple-gradient border-0 text-white font-semibold rounded-xl h-11"
              >
                {saveStatus === "sending" ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : isEditing ? (
                  "Update Profile"
                ) : (
                  "Save Profile"
                )}
              </Button>
            </div>
          </form>
        )}

        {/* My Activity */}
        {(() => {
          const activeAsHiring = allTasks.filter(
            (t) => t.user_id_origintor === userId && t.status !== "Completed",
          );
          const activeAsWorking = allTasks.filter(
            (t) => t.user_id_recipient === userId && t.status !== "Completed",
          );
          const activeApplied = allTasks.filter(
            (t) =>
              t.user_id_origintor !== userId &&
              !t.user_id_recipient &&
              t.applicants
                ?.split(",")
                .map((s) => s.trim())
                .includes(userId),
          );
          const activityMap = new Map<
            string,
            { task: LiveTask; role: "Hiring" | "Working" | "Applied" }
          >();
          for (const t of activeAsHiring)
            activityMap.set(t.task_id, { task: t, role: "Hiring" });
          for (const t of activeAsWorking)
            activityMap.set(t.task_id, { task: t, role: "Working" });
          for (const t of activeApplied) {
            if (!activityMap.has(t.task_id))
              activityMap.set(t.task_id, { task: t, role: "Applied" });
          }
          const myActivity = Array.from(activityMap.values());
          return (
            <div
              className="w-full rounded-2xl p-4 mt-5"
              style={{
                background: "oklch(0.16 0.01 265)",
                border: "1px solid oklch(0.24 0.012 265)",
              }}
            >
              <p
                className="text-xs uppercase tracking-widest font-semibold mb-3"
                style={{ color: "oklch(0.60 0.18 295)" }}
              >
                My Activity
              </p>
              {statsLoading ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Loading...
                </p>
              ) : myActivity.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">
                  No active tasks. Check the Explore Hub to find work!
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {myActivity.map(({ task, role }) => {
                    const badgeStyle =
                      role === "Hiring"
                        ? {
                            bg: "oklch(0.32 0.20 30 / 0.35)",
                            color: "oklch(0.85 0.22 30)",
                            border: "1px solid oklch(0.55 0.20 30 / 0.6)",
                          }
                        : role === "Working"
                          ? {
                              bg: "oklch(0.28 0.18 165 / 0.35)",
                              color: "oklch(0.78 0.22 165)",
                              border: "1px solid oklch(0.50 0.18 165 / 0.6)",
                            }
                          : {
                              bg: "oklch(0.28 0.10 75 / 0.3)",
                              color: "oklch(0.75 0.15 75)",
                              border: "1px solid oklch(0.45 0.12 75 / 0.5)",
                            };
                    return (
                      <div
                        key={task.task_id}
                        data-ocid={`activity.${task.task_id}.card`}
                        className="rounded-xl p-3 flex items-start justify-between gap-2"
                        style={{
                          background: "oklch(0.18 0.01 265)",
                          border: "1px solid oklch(0.26 0.012 265)",
                        }}
                      >
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <span className="text-sm font-semibold text-foreground truncate">
                            {task.task_name}
                          </span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="text-xs"
                              style={{ color: "oklch(0.65 0 0)" }}
                            >
                              ₹{task.price}
                            </span>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{
                                background: badgeStyle.bg,
                                color: badgeStyle.color,
                                border: badgeStyle.border,
                              }}
                            >
                              {role}
                            </span>
                            <span
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{
                                background: "oklch(0.20 0.01 265)",
                                color: "oklch(0.60 0 0)",
                              }}
                            >
                              {task.status || "Active"}
                            </span>
                          </div>
                          {role === "Hiring" && (
                            <span
                              className="text-xs"
                              style={{ color: "oklch(0.55 0.05 295)" }}
                            >
                              {!task.applicants ||
                              task.applicants.split(",").filter(Boolean)
                                .length === 0
                                ? "Waiting for Applicants"
                                : !task.user_id_recipient
                                  ? `${task.applicants.split(",").filter((s) => s.trim()).length} Applicant(s) Found`
                                  : `Performer: @${task.user_id_recipient}`}
                            </span>
                          )}
                          {role === "Working" && (
                            <span
                              className="text-xs"
                              style={{
                                color:
                                  task.payment_status === "Held by Admin"
                                    ? "oklch(0.68 0.18 145)"
                                    : "oklch(0.55 0 0)",
                              }}
                            >
                              {task.payment_status === "Held by Admin"
                                ? "✅ Start Working!"
                                : task.payment_status === "Pending"
                                  ? "Awaiting Admin Verification..."
                                  : task.status}
                            </span>
                          )}
                          {role === "Applied" && (
                            <span
                              className="text-xs"
                              style={{ color: "oklch(0.55 0 0)" }}
                            >
                              Request sent — waiting for poster
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* Stats */}
        <div
          className="w-full rounded-2xl p-4 mt-5"
          style={{
            background: "oklch(0.16 0.01 265)",
            border: "1px solid oklch(0.24 0.012 265)",
          }}
        >
          {statsLoading && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Loading stats...
            </p>
          )}
          {[
            {
              label: "Tasks Posted",
              value: String(postedTasksDeduped.length),
              modal: "posted" as const,
            },
            {
              label: "Tasks Completed",
              value: String(completedTasks.length),
              modal: "completed" as const,
            },
            {
              label: "Total Earned",
              value: `₹${totalEarned.toFixed(0)}`,
              modal: "earned" as const,
            },
          ].map(({ label, value, modal }) => (
            <button
              type="button"
              key={label}
              data-ocid={`profile.${modal}.button`}
              onClick={() => setActiveModal(modal)}
              className="flex justify-between py-2 border-b border-border w-full text-left transition-colors hover:bg-white/5 rounded-lg px-1"
              style={{ cursor: "pointer" }}
            >
              <span className="text-sm text-muted-foreground">{label}</span>
              <span
                className="text-sm font-bold"
                style={{ color: "oklch(0.78 0.20 295)" }}
              >
                {value}
              </span>
            </button>
          ))}
          <div className="flex justify-between py-2 px-1">
            <span className="text-sm text-muted-foreground">Rating</span>
            <span className="text-sm font-bold">
              {avgRating !== null ? renderStars(avgRating) : "Unrated"}
            </span>
          </div>
        </div>
      </div>

      {/* My Posted Tasks Modal */}
      {activeModal === "posted" && (
        <div
          style={modalOverlay}
          onClick={() => setActiveModal(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setActiveModal(null);
          }}
          role="presentation"
        >
          <div
            style={modalCard}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            aria-modal="true"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">
                My Posted Tasks
              </h3>
              <button
                type="button"
                data-ocid="profile.posted.close_button"
                onClick={() => setActiveModal(null)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                ✕
              </button>
            </div>
            <div
              className="overflow-y-auto flex-1 space-y-2 pr-1"
              style={{ maxHeight: "55vh" }}
            >
              {postedTasksDeduped.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No tasks found yet. Start by posting one!
                </p>
              ) : (
                postedTasksDeduped.map((t, i) => (
                  <PostedTaskCard
                    key={t.task_id || i}
                    task={t as LiveTask}
                    index={i}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Earnings History Modal */}
      {activeModal === "completed" && (
        <div
          style={modalOverlay}
          onClick={() => setActiveModal(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setActiveModal(null);
          }}
          role="presentation"
        >
          <div
            style={modalCard}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            aria-modal="true"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">
                Earnings History
              </h3>
              <button
                type="button"
                data-ocid="profile.completed.close_button"
                onClick={() => setActiveModal(null)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                ✕
              </button>
            </div>
            <div
              className="overflow-y-auto flex-1 space-y-2 pr-1"
              style={{ maxHeight: "55vh" }}
            >
              {completedTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No completed tasks yet. Help someone out!
                </p>
              ) : (
                completedTasks.map((t, i) => (
                  <div
                    key={t.task_id || i}
                    data-ocid={`profile.completed.item.${i + 1}`}
                    className="rounded-xl p-3 space-y-1"
                    style={{
                      background: "oklch(0.18 0.01 265)",
                      border: "1px solid oklch(0.28 0.012 265)",
                    }}
                  >
                    <span className="text-sm font-semibold text-foreground">
                      {t.task_name}
                    </span>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{t.completion_date || "—"}</span>
                      <span
                        style={{
                          color:
                            t.payment_status === "Paid Out"
                              ? "oklch(0.68 0.18 145)"
                              : "oklch(0.65 0 0)",
                        }}
                      >
                        {t.payment_status || "Pending"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Total Earned Modal */}
      {activeModal === "earned" && (
        <div
          style={modalOverlay}
          onClick={() => setActiveModal(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setActiveModal(null);
          }}
          role="presentation"
        >
          <div
            style={modalCard}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            aria-modal="true"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">
                Total Earned
              </h3>
              <button
                type="button"
                data-ocid="profile.earned.close_button"
                onClick={() => setActiveModal(null)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                ✕
              </button>
            </div>
            <div
              className="overflow-y-auto flex-1 space-y-2 pr-1"
              style={{ maxHeight: "50vh" }}
            >
              {paidOutTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No paid out tasks yet.
                </p>
              ) : (
                paidOutTasks.map((t, i) => (
                  <div
                    key={t.task_id || i}
                    data-ocid={`profile.earned.item.${i + 1}`}
                    className="rounded-xl p-3 flex justify-between items-center"
                    style={{
                      background: "oklch(0.18 0.01 265)",
                      border: "1px solid oklch(0.28 0.012 265)",
                    }}
                  >
                    <span className="text-sm text-foreground">
                      {t.task_name}
                    </span>
                    <span
                      className="text-sm font-bold"
                      style={{ color: "oklch(0.68 0.18 145)" }}
                    >
                      ₹{t.price}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="text-sm font-semibold text-muted-foreground">
                Total
              </span>
              <span
                className="text-base font-extrabold"
                style={{ color: "oklch(0.68 0.18 145)" }}
              >
                ₹{totalEarned.toFixed(0)}
              </span>
            </div>
          </div>
        </div>
      )}
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
  currentUserId,
  onTaskUpdate,
}: {
  tasks: LiveTask[];
  loading: boolean;
  fetchError: string;
  currentUserId: string | null;
  onTaskUpdate?: (taskId: string, updatedApplicants: string) => void;
}) {
  const [selectedTask, setSelectedTask] = useState<LiveTask | null>(null);
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
                currentUserId={currentUserId}
                onOpen={(t) => setSelectedTask(t)}
              />
            ))}
          </div>
        )}
        {selectedTask && (
          <TaskDetailModal
            task={selectedTask}
            currentUserId={currentUserId}
            allTasks={tasks}
            onClose={() => setSelectedTask(null)}
            onTaskUpdate={(updatedApplicants) => {
              onTaskUpdate?.(selectedTask.task_id, updatedApplicants);
              setSelectedTask((prev) =>
                prev ? { ...prev, applicants: updatedApplicants } : prev,
              );
            }}
          />
        )}
      </section>
      <WhyProxiiSection />
      <Footer />
    </main>
  );
}

// ── App root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [userId, setUserId] = useState<string | null>(() =>
    localStorage.getItem("proxii_user_id"),
  );
  const [activeTab, setActiveTab] = useState<Tab>("explore");
  const [tasks, setTasks] = useState<LiveTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksFetched, setTasksFetched] = useState(false);
  const [fetchError, setFetchError] = useState("");

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

  function handleLogout() {
    localStorage.removeItem("proxii_user_id");
    localStorage.removeItem("proxii_profile_saved");
    setUserId(null);
    setActiveTab("explore");
  }

  function handleAuth(newUserId: string) {
    setUserId(newUserId);
    setActiveTab("explore");
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-background text-foreground relative">
        <AnimatedBackground />
        <WelcomeScreen onAuth={handleAuth} />
      </div>
    );
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
            currentUserId={userId}
            onTaskUpdate={(taskId, updatedApplicants) =>
              setTasks((prev) =>
                prev.map((t) =>
                  t.task_id === taskId
                    ? { ...t, applicants: updatedApplicants }
                    : t,
                ),
              )
            }
          />
        )}
        {activeTab === "post" && (
          <PostTaskScreen
            onGoToExplore={() => handleTabChange("explore")}
            onTaskPosted={(task) => setTasks((prev) => [task, ...prev])}
          />
        )}
        {activeTab === "profile" && (
          <ProfileScreen
            userId={userId}
            onLogout={handleLogout}
            onGoToExplore={() => handleTabChange("explore")}
            onGoToPost={() => handleTabChange("post")}
          />
        )}
      </div>
      <BottomNav active={activeTab} onTabChange={handleTabChange} />
      <Toaster />
    </div>
  );
}
