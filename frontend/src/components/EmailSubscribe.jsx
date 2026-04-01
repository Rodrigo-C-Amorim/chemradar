import { useState } from "react";
import { subscribe } from "../api/client";

export default function EmailSubscribe() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await subscribe(email);
      setStatus("success");
      setMessage(res.message);
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(err.response?.data?.detail || "Erro ao cadastrar. Tente novamente.");
    }
  }

  return (
    <div className="hero-gradient rounded-2xl px-8 py-10 border border-brand-border relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute -left-8 -bottom-8 h-40 w-40 rounded-full bg-brand-blue/10 border border-brand-blue/10" />

      <div className="relative z-10 flex flex-col items-center text-center gap-5 max-w-lg mx-auto">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-blue/20 border border-brand-blue/30 text-3xl">
          🔔
        </div>

        <div>
          <h2 className="text-2xl font-extrabold uppercase tracking-tight text-white">
            Receba Alertas Semanais
          </h2>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Cadastre seu email e receba toda semana um resumo dos nichos
            em alta na engenharia química.
          </p>
        </div>

        {status === "success" ? (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-6 py-3 text-emerald-400 font-semibold text-sm">
            ✅ {message}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 sm:flex-row">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="flex-1 rounded-xl border border-brand-border bg-brand-navy/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-blue transition-colors"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="btn-outline disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === "loading" ? "Cadastrando..." : "Quero Receber"}
            </button>
          </form>
        )}

        {status === "error" && (
          <p className="text-sm text-red-400">{message}</p>
        )}

        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
          Sem spam · Cancele quando quiser
        </p>
      </div>
    </div>
  );
}
