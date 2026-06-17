import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "./Button";
import { GlassPanel } from "./GlassPanel";
import { signUpWithEmail, loginWithEmail } from "@/lib/auth";
import type { EarthIqSupabaseClient } from "@/lib/supabase";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  supabase: EarthIqSupabaseClient | null;
  onAuthSuccess: (user: any) => void;
  onContinueGuest: () => void;
}

export function AuthModal({
  isOpen,
  onClose,
  supabase,
  onAuthSuccess,
  onContinueGuest,
}: AuthModalProps) {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setErrorMsg("Authentication service is unavailable. Please run in Guest Mode.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (tab === "signin") {
        const { user } = await loginWithEmail({ client: supabase, email, password });
        if (user) {
          onAuthSuccess(user);
          onClose();
        }
      } else {
        const { user } = await signUpWithEmail({ client: supabase, email, password });
        setSuccessMsg("Account created! Please sign in.");
        setTab("signin");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An authentication error occurred.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <GlassPanel elevated className="relative p-6 sm:p-8 overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/45 hover:text-white transition-colors"
            aria-label="Close authentication modal"
          >
            <span className="text-xl">✕</span>
          </button>

          <div className="mb-6 text-center">
            <span className="text-3xl block mb-2" aria-hidden="true">🌍</span>
            <h2 className="text-xl font-bold tracking-wider text-white">EarthIQ Auth</h2>
            <p className="text-xs uppercase tracking-widest text-[#A3FFB0] mt-1">
              Climate Intelligence Platform
            </p>
          </div>

          <div className="flex border-b border-white/5 mb-6">
            <button
              onClick={() => {
                setTab("signin");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`flex-1 pb-3 text-sm font-semibold tracking-wider transition-colors relative ${
                tab === "signin" ? "text-white" : "text-white/45 hover:text-white/75"
              }`}
            >
              Sign In
              {tab === "signin" && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#A3FFB0]"
                />
              )}
            </button>
            <button
              onClick={() => {
                setTab("signup");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`flex-1 pb-3 text-sm font-semibold tracking-wider transition-colors relative ${
                tab === "signup" ? "text-white" : "text-white/45 hover:text-white/75"
              }`}
            >
              Sign Up
              {tab === "signup" && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#A3FFB0]"
                />
              )}
            </button>
          </div>

          {!supabase && (
            <div className="mb-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3 text-xs text-yellow-300/80">
              💡 Running in local-offline mode. Authentication is disabled because Supabase variables are not configured. You can continue as a Guest.
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 rounded-xl border border-green-500/20 bg-green-500/5 p-3 text-xs text-green-400">
              ✓ {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/45 mb-1.5 font-medium">
                Email Address
              </label>
              <input
                type="email"
                required
                disabled={!supabase || isLoading}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-white/10 bg-white/[0.03] text-white placeholder-white/30 focus:border-[#A3FFB0]/40 focus:bg-white/[0.06] outline-none text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-white/45 mb-1.5 font-medium">
                Password
              </label>
              <input
                type="password"
                required
                disabled={!supabase || isLoading}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-white/10 bg-white/[0.03] text-white placeholder-white/30 focus:border-[#A3FFB0]/40 focus:bg-white/[0.06] outline-none text-sm transition-all"
              />
            </div>

            <Button
              type="submit"
              disabled={!supabase || isLoading}
              className="w-full min-h-11 mt-2 text-sm tracking-wider font-semibold"
            >
              {isLoading ? "Authenticating..." : tab === "signin" ? "Sign In" : "Sign Up"}
            </Button>
          </form>

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <span className="relative px-3 text-[10px] uppercase tracking-[0.2em] bg-[#0d0d0d] text-white/30">
              or
            </span>
          </div>

          <button
            type="button"
            onClick={onContinueGuest}
            className="w-full min-h-11 rounded-xl border border-white/10 bg-white/[0.02] text-white hover:bg-white/[0.05] active:bg-white/[0.08] text-sm tracking-wider font-semibold transition-all"
          >
            Continue as Guest
          </button>
        </GlassPanel>
      </motion.div>
    </div>
  );
}
