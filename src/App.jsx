import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  Download,
  FileText,
  History,
  LayoutDashboard,
  RotateCcw,
  Save,
  ShieldAlert,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";

const STORAGE_KEY = "xauusd-fundamental-v1";
const HISTORY_KEY = "xauusd-fundamental-history-v1";

const initialIndicators = [
  { id: "nfp", name: "NFP — emplois non agricoles", category: "Emploi", period: "M/M", unit: "milliers", actual: "", forecast: "", previous: "", date: "", note: "" },
  { id: "unemployment", name: "Taux de chômage", category: "Emploi", period: "Niveau", unit: "%", actual: "", forecast: "", previous: "", date: "", note: "" },
  { id: "wages", name: "Salaire horaire moyen", category: "Emploi", period: "M/M", unit: "%", actual: "", forecast: "", previous: "", date: "", note: "" },
  { id: "claims", name: "Jobless Claims — inscriptions au chômage", category: "Emploi", period: "Hebdomadaire", unit: "milliers", actual: "", forecast: "", previous: "", date: "", note: "" },
  { id: "cpi_mm", name: "CPI — inflation globale", category: "Inflation", period: "M/M", unit: "%", actual: "", forecast: "", previous: "", date: "", note: "" },
  { id: "cpi_yy", name: "CPI — inflation globale", category: "Inflation", period: "Y/Y", unit: "%", actual: "", forecast: "", previous: "", date: "", note: "" },
  { id: "core_cpi_mm", name: "Core CPI — inflation sous-jacente", category: "Inflation", period: "M/M", unit: "%", actual: "", forecast: "", previous: "", date: "", note: "" },
  { id: "core_cpi_yy", name: "Core CPI — inflation sous-jacente", category: "Inflation", period: "Y/Y", unit: "%", actual: "", forecast: "", previous: "", date: "", note: "" },
  { id: "pce_mm", name: "PCE — inflation globale", category: "Inflation", period: "M/M", unit: "%", actual: "", forecast: "", previous: "", date: "", note: "" },
  { id: "pce_yy", name: "PCE — inflation globale", category: "Inflation", period: "Y/Y", unit: "%", actual: "", forecast: "", previous: "", date: "", note: "" },
  { id: "core_pce_mm", name: "Core PCE — inflation sous-jacente", category: "Inflation", period: "M/M", unit: "%", actual: "", forecast: "", previous: "", date: "", note: "" },
  { id: "core_pce_yy", name: "Core PCE — inflation sous-jacente", category: "Inflation", period: "Y/Y", unit: "%", actual: "", forecast: "", previous: "", date: "", note: "" },
  { id: "ppi_mm", name: "PPI — prix à la production", category: "Inflation", period: "M/M", unit: "%", actual: "", forecast: "", previous: "", date: "", note: "" },
  { id: "ppi_yy", name: "PPI — prix à la production", category: "Inflation", period: "Y/Y", unit: "%", actual: "", forecast: "", previous: "", date: "", note: "" },
  { id: "gdp", name: "GDP — croissance économique", category: "Activité", period: "Trimestriel annualisé", unit: "%", actual: "", forecast: "", previous: "", date: "", note: "" },
  { id: "ism_manufacturing", name: "ISM Manufacturing PMI", category: "Activité", period: "Mensuel", unit: "indice", actual: "", forecast: "", previous: "", date: "", note: "" },
  { id: "ism_services", name: "ISM Services PMI", category: "Activité", period: "Mensuel", unit: "indice", actual: "", forecast: "", previous: "", date: "", note: "" },
  { id: "retail_sales", name: "Retail Sales — ventes au détail", category: "Activité", period: "M/M", unit: "%", actual: "", forecast: "", previous: "", date: "", note: "" },
  { id: "fed_rate", name: "Taux directeur de la Fed", category: "Fed", period: "Niveau", unit: "%", actual: "", forecast: "", previous: "", date: "", note: "" },
];

const defaultForm = {
  analysisDate: new Date().toISOString().slice(0, 10),
  fedBias: "unknown",
  fedEvidence: "",
  realYieldValue: "",
  realYieldTrend: "unknown",
  realYieldPeriod: "5d",
  dxyValue: "",
  dxyD1: "unknown",
  dxyH4: "unknown",
  dxyStructure: "",
  geopolitical: "unknown",
  geopoliticalNote: "",
  centralBanks: "unknown",
  centralBanksNote: "",
  etfFlows: "unknown",
  etfNote: "",
  cotPosition: "unknown",
  cotNote: "",
  mediumTermRisk: "unknown",
  mediumTermNote: "",
  goldStructure: "unknown",
  goldStructureNote: "",
  generalNotes: "",
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function formatNumber(value) {
  if (value === "" || value === null || value === undefined) return "Non renseigné";
  const n = Number(value);
  return Number.isFinite(n) ? String(n).replace(".", ",") : "Valeur invalide";
}

function describeIndicator(indicator) {
  const { actual, forecast, previous, unit, name } = indicator;

  if (actual === "" || forecast === "") {
    return {
      status: "missing",
      title: "Données insuffisantes",
      text: "Il faut renseigner le résultat réel et la prévision pour mesurer la surprise. Aucun biais n'est attribué automatiquement.",
      direction: "unknown",
    };
  }

  const a = Number(actual);
  const f = Number(forecast);

  if (!Number.isFinite(a) || !Number.isFinite(f)) {
    return {
      status: "missing",
      title: "Valeurs invalides",
      text: "Vérifie les chiffres saisis. Utilise un nombre décimal, par exemple 0.2.",
      direction: "unknown",
    };
  }

  const diff = a - f;
  const higherIsUSDPositive = [
    "nfp",
    "wages",
    "ism_manufacturing",
    "ism_services",
    "retail_sales",
    "gdp",
    "fed_rate",
  ].includes(indicator.id);

  const higherIsUSDNegative = [
    "unemployment",
    "claims",
  ].includes(indicator.id);

  const inflationIds = [
    "cpi_mm",
    "cpi_yy",
    "core_cpi_mm",
    "core_cpi_yy",
    "pce_mm",
    "pce_yy",
    "core_pce_mm",
    "core_pce_yy",
    "ppi_mm",
    "ppi_yy",
  ];

  let direction = "unknown";
  let title = "Surprise limitée ou nulle";
  let text = "Le résultat est proche de la prévision. La réaction dépendra du contexte, des révisions et des attentes déjà intégrées.";

  if (Math.abs(diff) < 0.0000001) {
    return { status: "neutral", title, text, direction: "neutral" };
  }

  const higher = diff > 0;

  if (inflationIds.includes(indicator.id)) {
    direction = higher ? "usd_positive" : "usd_negative";
    title = higher ? "Inflation supérieure aux attentes" : "Inflation inférieure aux attentes";
    text = higher
      ? "Cela peut renforcer les anticipations d'une Fed restrictive ou de taux élevés plus longtemps, ce qui peut soutenir le dollar et peser sur l'or. Vérifie si les marchés interprètent réellement la surprise ainsi."
      : "Cela peut réduire la pression inflationniste et favoriser des anticipations de politique monétaire moins restrictive, ce qui peut peser sur le dollar et soutenir l'or. La réaction dépend du contexte.";
  } else if (higherIsUSDPositive) {
    direction = higher ? "usd_positive" : "usd_negative";
    title = higher ? "Résultat supérieur aux attentes" : "Résultat inférieur aux attentes";
    text = higher
      ? "Cette surprise peut soutenir le dollar si le marché y voit une économie plus résistante ou des taux susceptibles de rester élevés. Vérifie l'indicateur et la réaction des rendements."
      : "Cette surprise peut peser sur le dollar si elle renforce les attentes d'un ralentissement ou d'une politique monétaire moins restrictive. Le résultat n'est pas un signal automatique sur l'or.";
  } else if (higherIsUSDNegative) {
    direction = higher ? "usd_negative" : "usd_positive";
    title = higher ? "Résultat supérieur aux attentes" : "Résultat inférieur aux attentes";
    text = higher
      ? "Une hausse du chômage ou des inscriptions peut signaler un refroidissement du marché du travail et peser sur le dollar si les attentes de taux diminuent."
      : "Un chômage ou des inscriptions plus faibles que prévu peuvent indiquer un marché du travail plus solide et soutenir le dollar si le marché révise ses attentes de taux à la hausse.";
  }

  if (previous !== "" && Number.isFinite(Number(previous))) {
    const p = Number(previous);
    text += ` Résultat précédent saisi : ${formatNumber(p)} ${unit}. La comparaison au précédent est distincte de la surprise par rapport à la prévision.`;
  } else {
    text += " Le résultat précédent n'est pas renseigné.";
  }

  text += ` Écart réel-prévision : ${diff > 0 ? "+" : ""}${formatNumber(diff)} ${unit}.`;

  return {
    status: direction === "neutral" ? "neutral" : "observed",
    title,
    text,
    direction,
    diff,
  };
}

function biasFromIndicator(indicator) {
  const result = describeIndicator(indicator);
  if (result.direction === "usd_positive") return -1;
  if (result.direction === "usd_negative") return 1;
  return 0;
}

function buildAnalysis(form, indicators) {
  const missing = [];
  const evidence = [];
  let score = 0;

  const enteredIndicators = indicators.filter(
    (item) => item.actual !== "" || item.forecast !== "" || item.previous !== ""
  );

  for (const indicator of indicators) {
    const result = describeIndicator(indicator);
    if (result.status === "missing" && (indicator.actual !== "" || indicator.forecast !== "" || indicator.previous !== "")) {
      missing.push(`${indicator.name} (${indicator.period}) : résultat réel et prévision requis.`);
    }
    if (result.status === "observed" || result.status === "neutral") {
      const weight = ["core_cpi_mm", "core_cpi_yy", "core_pce_mm", "core_pce_yy", "nfp"].includes(indicator.id) ? 1.5 : 1;
      score += biasFromIndicator(indicator) * weight;
      evidence.push({
        type: result.direction === "usd_positive" ? "usd_positive" : result.direction === "usd_negative" ? "usd_negative" : "neutral",
        title: `${indicator.name} — ${indicator.period}`,
        detail: result.text,
      });
    }
  }

  const fedMap = {
    restrictive: { score: -2, label: "Fed restrictive", detail: "Une politique plus restrictive peut soutenir le dollar et augmenter le coût d'opportunité de l'or." },
    accommodative: { score: 2, label: "Fed accommodante", detail: "Une politique moins restrictive peut réduire le soutien des taux au dollar et favoriser l'or." },
    neutral: { score: 0, label: "Fed neutre", detail: "Aucun biais clair n'est attribué à la politique monétaire." },
    unknown: { score: 0, label: "Fed inconnue", detail: "Les attentes de taux et les communications récentes de la Fed ne sont pas renseignées." },
  };

  const fed = fedMap[form.fedBias] || fedMap.unknown;
  score += fed.score;
  if (form.fedBias === "unknown") missing.push("Attentes concernant la Fed.");
  else evidence.push({ type: fed.score < 0 ? "usd_positive" : fed.score > 0 ? "usd_negative" : "neutral", title: fed.label, detail: `${fed.detail} ${form.fedEvidence || ""}`.trim() });

  if (form.realYieldTrend === "down") {
    score += 2;
    evidence.push({ type: "usd_negative", title: "Taux réels en baisse", detail: "Une baisse des taux réels américains peut réduire le coût d'opportunité de détention de l'or et lui être favorable, toutes choses égales par ailleurs." });
  } else if (form.realYieldTrend === "up") {
    score -= 2;
    evidence.push({ type: "usd_positive", title: "Taux réels en hausse", detail: "Une hausse des taux réels peut rendre les actifs rémunérés plus attractifs et exercer une pression sur l'or." });
  } else if (form.realYieldTrend === "stable") {
    evidence.push({ type: "neutral", title: "Taux réels stables", detail: "Pas de direction nette identifiée sur la période sélectionnée." });
  } else {
    missing.push("Tendance du taux réel américain DFII10.");
  }

  if (form.realYieldValue === "") missing.push("Valeur actuelle du DFII10.");
  if (form.dxyD1 === "up") {
    score -= 1.5;
    evidence.push({ type: "usd_positive", title: "DXY haussier sur D1", detail: "Un dollar structurellement plus fort constitue généralement un vent contraire pour l'or coté en dollars." });
  } else if (form.dxyD1 === "down") {
    score += 1.5;
    evidence.push({ type: "usd_negative", title: "DXY baissier sur D1", detail: "Un dollar en baisse peut soutenir l'or, sans garantir sa hausse." });
  } else {
    missing.push("Direction du DXY sur D1.");
  }

  if (form.dxyH4 === "up") {
    score -= 1;
    evidence.push({ type: "usd_positive", title: "DXY haussier sur H4", detail: "Le dollar montre une force à court terme selon l'observation saisie." });
  } else if (form.dxyH4 === "down") {
    score += 1;
    evidence.push({ type: "usd_negative", title: "DXY baissier sur H4", detail: "Le dollar montre un affaiblissement à court terme selon l'observation saisie." });
  } else {
    missing.push("Direction du DXY sur H4.");
  }

  if (form.dxyValue === "") missing.push("Valeur actuelle du DXY (facultative mais utile).");

  const structuralFactors = [
    { key: "centralBanks", label: "Achats des banques centrales", supportive: "supportive", adverse: "adverse" },
    { key: "etfFlows", label: "Flux des ETF sur l'or", supportive: "inflows", adverse: "outflows" },
    { key: "cotPosition", label: "Positionnement COT", supportive: "net_long_increasing", adverse: "net_long_decreasing" },
    { key: "geopolitical", label: "Risques géopolitiques", supportive: "risk_up", adverse: "risk_down" },
    { key: "mediumTermRisk", label: "Risques financiers à moyen terme", supportive: "risk_up", adverse: "risk_down" },
  ];

  for (const factor of structuralFactors) {
    const value = form[factor.key];
    if (value === factor.supportive) {
      score += 1;
      evidence.push({ type: "gold_positive", title: factor.label, detail: "L'observation saisie peut soutenir la demande d'or. Vérifie la source, la date et la durée de cet effet." });
    } else if (value === factor.adverse) {
      score -= 1;
      evidence.push({ type: "gold_negative", title: factor.label, detail: "L'observation saisie peut limiter le soutien de ce facteur à l'or. Son impact doit être confirmé par les données de marché." });
    } else if (value === "unknown") {
      missing.push(`${factor.label} : information non renseignée.`);
    } else {
      evidence.push({ type: "neutral", title: factor.label, detail: "Aucun biais directionnel n'est déduit automatiquement de cette observation." });
    }
  }

  if (form.goldStructure === "bullish") {
    evidence.push({ type: "gold_positive", title: "Structure technique de l'or haussière", detail: "Observation technique fournie par l'utilisateur ; elle ne remplace pas l'analyse fondamentale." });
  } else if (form.goldStructure === "bearish") {
    evidence.push({ type: "gold_negative", title: "Structure technique de l'or baissière", detail: "Observation technique fournie par l'utilisateur ; elle ne remplace pas l'analyse fondamentale." });
  } else {
    missing.push("Structure actuelle de XAUUSD.");
  }

  let bias = "Biais indéterminé";
  let tone = "neutral";
  let interpretation = "Les données saisies ne permettent pas de dégager un avantage directionnel clair. Complète les informations manquantes avant de construire une hypothèse.";
  if (score >= 3) {
    bias = "Facteurs plutôt favorables à l'or";
    tone = "positive";
    interpretation = "Plusieurs éléments saisis semblent soutenir l'or. Cette convergence constitue une hypothèse, pas une prédiction. Vérifie si les prix, le dollar et les rendements confirment le scénario.";
  } else if (score <= -3) {
    bias = "Facteurs plutôt défavorables à l'or";
    tone = "negative";
    interpretation = "Plusieurs éléments saisis semblent exercer une pression sur l'or. Cette convergence constitue une hypothèse, pas une prédiction. Une demande de valeur refuge ou d'autres facteurs peuvent contrecarrer ce biais.";
  } else if (score > 0) {
    bias = "Léger biais favorable à l'or";
    tone = "positive";
    interpretation = "Certains facteurs favorisent l'or, mais leur convergence est insuffisante pour parler d'un biais robuste. Surveille les éléments contradictoires et les confirmations.";
  } else if (score < 0) {
    bias = "Léger biais défavorable à l'or";
    tone = "negative";
    interpretation = "Certains facteurs exercent une pression sur l'or, mais leur convergence est insuffisante pour parler d'un biais robuste. Surveille les éléments contradictoires et les confirmations.";
  }

  const positives = evidence.filter((e) => e.type === "usd_negative" || e.type === "gold_positive");
  const negatives = evidence.filter((e) => e.type === "usd_positive" || e.type === "gold_negative");
  const neutrals = evidence.filter((e) => e.type === "neutral");

  const contradictions = [];
  if (positives.length && negatives.length) {
    contradictions.push("Des facteurs favorables et défavorables coexistent. Le biais global ne doit pas masquer ces divergences.");
  }
  if (form.dxyD1 === "up" && form.dxyH4 === "down") {
    contradictions.push("Le DXY reste haussier sur D1 mais baissier sur H4 : cela peut correspondre à une correction du dollar, pas nécessairement à un retournement durable.");
  }
  if (form.dxyD1 === "down" && form.dxyH4 === "up") {
    contradictions.push("Le DXY est baissier sur D1 mais haussier sur H4 : il peut s'agir d'un rebond du dollar dans une tendance plus large baissière.");
  }

  if (enteredIndicators.length === 0) {
    missing.push("Aucune publication macroéconomique chiffrée n'a été saisie.");
  }

  return {
    bias,
    tone,
    score,
    interpretation,
    evidence,
    positives,
    negatives,
    neutrals,
    missing: [...new Set(missing)],
    contradictions,
    indicatorCount: enteredIndicators.length,
  };
}

function initialIndicatorsWithSaved(saved) {
  if (!Array.isArray(saved)) return initialIndicators;
  return initialIndicators.map((item) => {
    const existing = saved.find((x) => x.id === item.id);
    return existing ? { ...item, ...existing } : item;
  });
}

function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

function SelectField({ label, value, onChange, options, hint }) {
  return (
    <Field label={label} hint={hint}>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([val, text]) => (
          <option key={val} value={val}>{text}</option>
        ))}
      </select>
    </Field>
  );
}

function TextField({ label, value, onChange, placeholder = "", type = "text", hint }) {
  return (
    <Field label={label} hint={hint}>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

function TextAreaField({ label, value, onChange, placeholder = "", rows = 3 }) {
  return (
    <Field label={label}>
      <textarea rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

function Section({ title, subtitle, icon: Icon, children }) {
  return (
    <section className="panel section-panel">
      <div className="section-heading">
        <div className="section-icon"><Icon size={19} /></div>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function IndicatorCard({ indicator, onChange }) {
  const result = describeIndicator(indicator);
  const hasValues = indicator.actual !== "" || indicator.forecast !== "" || indicator.previous !== "";

  return (
    <details className="indicator-card" open={hasValues}>
      <summary>
        <span className="indicator-name">{indicator.name}</span>
        <span className="indicator-meta">{indicator.period}</span>
        <span className={`mini-status ${result.status}`}>
          {result.status === "missing" ? "À compléter" : result.direction === "usd_positive" ? "USD +" : result.direction === "usd_negative" ? "USD −" : "Neutre"}
        </span>
        <ChevronDown size={16} className="details-chevron" />
      </summary>
      <div className="indicator-fields">
        <div className="form-grid four">
          <TextField label="Résultat réel" value={indicator.actual} onChange={(v) => onChange("actual", v)} placeholder="Ex. 0.2" />
          <TextField label="Prévision" value={indicator.forecast} onChange={(v) => onChange("forecast", v)} placeholder="Ex. 0.3" />
          <TextField label="Précédent" value={indicator.previous} onChange={(v) => onChange("previous", v)} placeholder="Ex. 0.4" />
          <SelectField label="Unité" value={indicator.unit} onChange={(v) => onChange("unit", v)} options={[
            ["%", "%"], ["milliers", "Milliers"], ["indice", "Points d'indice"], ["millions", "Millions"], ["milliards", "Milliards"], ["autre", "Autre"],
          ]} />
        </div>
        <div className="form-grid two">
          <TextField label="Date de publication" type="date" value={indicator.date} onChange={(v) => onChange("date", v)} />
          <TextField label="Période" value={indicator.period} onChange={(v) => onChange("period", v)} />
        </div>
        <TextAreaField label="Notes / source / révision" value={indicator.note} onChange={(v) => onChange("note", v)} placeholder="Ex. valeur révisée, source officielle, réaction du marché..." rows={2} />
        <div className={`indicator-interpretation ${result.status}`}>
          <strong>{result.title}</strong>
          <p>{result.text}</p>
        </div>
      </div>
    </details>
  );
}

export default function App() {
  const [savedState] = useState(() => loadJSON(STORAGE_KEY, null));
  const [form, setForm] = useState(() => ({ ...defaultForm, ...(savedState?.form || {}) }));
  const [indicators, setIndicators] = useState(() => initialIndicatorsWithSaved(savedState?.indicators));
  const [history, setHistory] = useState(() => loadJSON(HISTORY_KEY, []));
  const [activeTab, setActiveTab] = useState("dashboard");
  const [categoryFilter, setCategoryFilter] = useState("Toutes");
  const [search, setSearch] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [selectedHistory, setSelectedHistory] = useState(null);

  const analysis = useMemo(() => buildAnalysis(form, indicators), [form, indicators]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, indicators }));
    } catch {
      setSavedMessage("Stockage local indisponible. Exporte tes analyses pour les conserver.");
    }
  }, [form, indicators]);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      setSavedMessage("Historique trop volumineux. Exporte tes analyses avant de continuer.");
    }
  }, [history]);

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateIndicator(id, key, value) {
    setIndicators((current) =>
      current.map((item) => item.id === id ? { ...item, [key]: value } : item)
    );
  }

  function saveAnalysis() {
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      analysisDate: form.analysisDate,
      form: structuredClone(form),
      indicators: structuredClone(indicators),
      analysis: structuredClone(analysis),
    };
    setHistory((current) => [item, ...current].slice(0, 100));
    setSavedMessage("Analyse ajoutée à l'historique.");
    setActiveTab("history");
    setSelectedHistory(null);
  }

  function loadAnalysis(item) {
    setForm({ ...defaultForm, ...item.form });
    setIndicators(initialIndicatorsWithSaved(item.indicators));
    setSelectedHistory(null);
    setActiveTab("dashboard");
    setSavedMessage("Analyse chargée. Tu peux maintenant la modifier.");
  }

  function deleteHistory(id) {
    setHistory((current) => current.filter((item) => item.id !== id));
    if (selectedHistory === id) setSelectedHistory(null);
  }

  function resetForm() {
    if (!window.confirm("Réinitialiser les champs de l'analyse actuelle ? L'historique ne sera pas supprimé.")) return;
    setForm({ ...defaultForm, analysisDate: new Date().toISOString().slice(0, 10) });
    setIndicators(initialIndicators.map((item) => ({ ...item })));
    setSavedMessage("Formulaire réinitialisé.");
  }

  function exportText(item = null) {
    const targetForm = item?.form || form;
    const targetIndicators = item?.indicators || indicators;
    const targetAnalysis = item?.analysis || analysis;
    const lines = [
      "XAUUSD FUNDAMENTAL LAB",
      `Date d'analyse : ${targetForm.analysisDate || "Non renseignée"}`,
      "",
      "BIAS PROVISOIRE",
      targetAnalysis.bias,
      targetAnalysis.interpretation,
      "",
      "FACTEURS MACROÉCONOMIQUES",
    ];

    for (const indicator of targetIndicators) {
      if (indicator.actual !== "" || indicator.forecast !== "" || indicator.previous !== "") {
        const result = describeIndicator(indicator);
        lines.push(
          `${indicator.name} (${indicator.period})`,
          `Réel : ${indicator.actual || "NR"} ${indicator.unit}; prévision : ${indicator.forecast || "NR"} ${indicator.unit}; précédent : ${indicator.previous || "NR"} ${indicator.unit}`,
          result.title,
          result.text,
          ""
        );
      }
    }

    lines.push("FACTEURS OBSERVÉS");
    for (const item of targetAnalysis.evidence) lines.push(`- ${item.title}: ${item.detail}`);
    lines.push("", "CONTRADICTIONS");
    for (const item of targetAnalysis.contradictions) lines.push(`- ${item}`);
    lines.push("", "DONNÉES MANQUANTES");
    for (const item of targetAnalysis.missing) lines.push(`- ${item}`);
    lines.push("", "NOTES", targetForm.generalNotes || "Aucune note.", "");
    lines.push("Cette analyse est une aide à la réflexion, pas un conseil financier ni un signal de trading.");

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `xauusd-analysis-${targetForm.analysisDate || "export"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const categories = ["Toutes", ...new Set(indicators.map((item) => item.category))];
  const filteredIndicators = indicators.filter((item) => {
    const matchesCategory = categoryFilter === "Toutes" || item.category === categoryFilter;
    const matchesSearch = `${item.name} ${item.category}`.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  const filledCount = indicators.filter((item) => item.actual !== "" || item.forecast !== "" || item.previous !== "").length;
  const readyCount = indicators.filter((item) => item.actual !== "" && item.forecast !== "").length;

  const structuralOptions = {
    unknown: "Non renseigné",
    neutral: "Stable / aucun biais clair",
    supportive: "Achats soutenus / favorable à l'or",
    adverse: "Achats en baisse / défavorable à l'or",
    inflows: "Entrées nettes / favorable à l'or",
    outflows: "Sorties nettes / défavorable à l'or",
    net_long_increasing: "Positions nettes longues en hausse",
    net_long_decreasing: "Positions nettes longues en baisse",
    risk_up: "Risques en hausse / demande refuge possible",
    risk_down: "Apaisement des risques",
  };

  const historyItem = history.find((item) => item.id === selectedHistory);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Activity size={23} /></div>
          <div>
            <div className="brand-title">FUNDAMENTAL LAB</div>
            <div className="brand-subtitle">XAUUSD · RESEARCH DESK</div>
          </div>
        </div>

        <div className="side-label">WORKSPACE</div>
        <nav className="side-nav">
          <button className={activeTab === "dashboard" ? "active" : ""} onClick={() => setActiveTab("dashboard")}><LayoutDashboard size={18} /> Analyse fondamentale</button>
          <button className={activeTab === "macro" ? "active" : ""} onClick={() => setActiveTab("macro")}><BarChart3 size={18} /> Données macro</button>
          <button className={activeTab === "structure" ? "active" : ""} onClick={() => setActiveTab("structure")}><TrendingUp size={18} /> Contexte structurel</button>
          <button className={activeTab === "history" ? "active" : ""} onClick={() => setActiveTab("history")}><History size={18} /> Historique <span className="nav-count">{history.length}</span></button>
        </nav>

        <div className="sidebar-bottom">
          <div className="local-status"><span className="status-dot" /> Stockage local actif</div>
          <p>Les données restent dans ce navigateur. Exporte régulièrement tes analyses pour en conserver une copie.</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <div className="eyebrow">MARKET INTELLIGENCE / GOLD</div>
            <h1>Analyse fondamentale</h1>
          </div>
          <div className="topbar-actions">
            <span className="date-label"><CalendarDays size={15} /> {form.analysisDate}</span>
            <button className="btn btn-secondary" onClick={resetForm}><RotateCcw size={16} /> Réinitialiser</button>
            <button className="btn btn-primary" onClick={saveAnalysis}><Save size={16} /> Sauvegarder l'analyse</button>
          </div>
        </header>

        {savedMessage && (
          <div className="notice"><Check size={16} /> {savedMessage} <button onClick={() => setSavedMessage("")} aria-label="Fermer"><X size={15} /></button></div>
        )}

        {activeTab === "dashboard" && (
          <>
            <section className={`hero-card tone-${analysis.tone}`}>
              <div className="hero-top">
                <div className="hero-icon"><Activity size={21} /></div>
                <span className="overline">HYPOTHÈSE FONDAMENTALE · PAS UN SIGNAL</span>
                <span className="hero-date">{form.analysisDate}</span>
              </div>
              <div className="hero-main">
                <div>
                  <h2>{analysis.bias}</h2>
                  <p>{analysis.interpretation}</p>
                </div>
                <div className="hero-score">
                  <span>Indice interne</span>
                  <strong>{analysis.score > 0 ? "+" : ""}{analysis.score}</strong>
                  <small>heuristique · non probabiliste</small>
                </div>
              </div>
              <div className="hero-bottom">
                <span><ClipboardList size={15} /> {filledCount} indicateur(s) renseigné(s)</span>
                <span><Check size={15} /> {readyCount} avec réel + prévision</span>
                <span><AlertTriangle size={15} /> {analysis.missing.length} élément(s) à vérifier</span>
              </div>
            </section>

            <div className="metric-grid">
              <div className="metric-card"><div className="metric-icon gold"><Wallet size={18} /></div><span>DFII10 · taux réel</span><strong>{form.realYieldValue !== "" ? `${form.realYieldValue}%` : "—"}</strong><small>{form.realYieldTrend === "up" ? "En hausse" : form.realYieldTrend === "down" ? "En baisse" : form.realYieldTrend === "stable" ? "Stable" : "Direction inconnue"}</small></div>
              <div className="metric-card"><div className="metric-icon blue"><Activity size={18} /></div><span>DXY · valeur saisie</span><strong>{form.dxyValue || "—"}</strong><small>D1 : {form.dxyD1 === "up" ? "Haussier" : form.dxyD1 === "down" ? "Baissier" : "Inconnu"}</small></div>
              <div className="metric-card"><div className="metric-icon purple"><BarChart3 size={18} /></div><span>Publications renseignées</span><strong>{filledCount}/{indicators.length}</strong><small>{readyCount} comparables aux prévisions</small></div>
              <div className="metric-card"><div className="metric-icon orange"><ShieldAlert size={18} /></div><span>Informations manquantes</span><strong>{analysis.missing.length}</strong><small>À compléter ou à vérifier</small></div>
            </div>

            <Section title="Groupe A — Biais fondamental principal" subtitle="Facteurs macroéconomiques susceptibles d'influencer le dollar et l'or." icon={Activity}>
              <div className="form-grid two">
                <SelectField label="Attentes concernant la Fed" value={form.fedBias} onChange={(v) => updateForm("fedBias", v)} options={[
                  ["unknown", "Non renseignées"], ["restrictive", "Restrictive · taux élevés plus longtemps"], ["accommodative", "Accommodante · baisse des taux possible"], ["neutral", "Neutre / incertaine"],
                ]} />
                <TextField label="Valeur DFII10 (%)" value={form.realYieldValue} onChange={(v) => updateForm("realYieldValue", v)} placeholder="Ex. 2.78" hint="Taux réel américain à 10 ans." />
                <SelectField label="Tendance du DFII10" value={form.realYieldTrend} onChange={(v) => updateForm("realYieldTrend", v)} options={[
                  ["unknown", "Inconnue"], ["up", "En hausse"], ["down", "En baisse"], ["stable", "Stable / latérale"],
                ]} />
                <SelectField label="Période observée" value={form.realYieldPeriod} onChange={(v) => updateForm("realYieldPeriod", v)} options={[
                  ["1d", "1 jour"], ["5d", "5 jours"], ["1m", "1 mois"], ["3m", "3 mois"],
                ]} />
                <TextField label="Valeur DXY" value={form.dxyValue} onChange={(v) => updateForm("dxyValue", v)} placeholder="Ex. 99.50" />
                <SelectField label="DXY — D1" value={form.dxyD1} onChange={(v) => updateForm("dxyD1", v)} options={[
                  ["unknown", "Non analysé"], ["up", "Haussier"], ["down", "Baissier"], ["sideways", "Latéral"],
                ]} />
                <SelectField label="DXY — H4" value={form.dxyH4} onChange={(v) => updateForm("dxyH4", v)} options={[
                  ["unknown", "Non analysé"], ["up", "Haussier"], ["down", "Baissier"], ["sideways", "Latéral"],
                ]} />
                <TextField label="Structure DXY / CHOCH / BOS" value={form.dxyStructure} onChange={(v) => updateForm("dxyStructure", v)} placeholder="Ex. CHOCH baissier du dernier Low H4" />
              </div>
              <div className="form-grid two spaced">
                <SelectField label="Géopolitique actuelle" value={form.geopolitical} onChange={(v) => updateForm("geopolitical", v)} options={[
                  ["unknown", "Non renseignée"], ["risk_up", "Risques en hausse"], ["neutral", "Pas de changement majeur"], ["risk_down", "Apaisement des risques"],
                ]} />
                <TextAreaField label="Événements / sources" value={form.geopoliticalNote} onChange={(v) => updateForm("geopoliticalNote", v)} placeholder="Décris les faits observés sans supposer leur impact." rows={2} />
              </div>
              <div className="form-grid two spaced">
                <TextAreaField label="Notes Fed" value={form.fedEvidence} onChange={(v) => updateForm("fedEvidence", v)} placeholder="Déclarations, décision, attentes du marché..." rows={2} />
                <TextAreaField label="Notes générales" value={form.generalNotes} onChange={(v) => updateForm("generalNotes", v)} placeholder="Observations, sources, contradictions..." rows={2} />
              </div>
            </Section>

            <Section title="Interprétation des facteurs" subtitle="Le moteur distingue les observations, les hypothèses et les informations manquantes." icon={FileText}>
              <div className="evidence-grid">
                <div className="evidence-column">
                  <h3><ArrowUpRight size={17} /> Potentiellement favorables à l'or</h3>
                  {analysis.positives.length ? analysis.positives.map((item, i) => <div className="evidence-item positive" key={`${item.title}-${i}`}><strong>{item.title}</strong><p>{item.detail}</p></div>) : <div className="empty-state">Aucun facteur favorable confirmé par les données saisies.</div>}
                </div>
                <div className="evidence-column">
                  <h3><ArrowDownRight size={17} /> Potentiellement défavorables à l'or</h3>
                  {analysis.negatives.length ? analysis.negatives.map((item, i) => <div className="evidence-item negative" key={`${item.title}-${i}`}><strong>{item.title}</strong><p>{item.detail}</p></div>) : <div className="empty-state">Aucun facteur défavorable confirmé par les données saisies.</div>}
                </div>
              </div>
              {analysis.contradictions.length > 0 && (
                <div className="warning-block"><AlertTriangle size={18} /><div><strong>Contradictions à surveiller</strong>{analysis.contradictions.map((item, i) => <p key={i}>{item}</p>)}</div></div>
              )}
              {analysis.missing.length > 0 && (
                <div className="missing-block"><h3><AlertTriangle size={17} /> Informations à compléter</h3><ul>{analysis.missing.map((item, i) => <li key={i}>{item}</li>)}</ul></div>
              )}
              <div className="disclaimer"><ShieldAlert size={17} /><p>Cette analyse est une heuristique explicable, pas un modèle statistique validé. Les facteurs ne sont pas indépendants et les réactions de marché peuvent contredire les relations habituelles.</p></div>
            </Section>
          </>
        )}

        {activeTab === "macro" && (
          <>
            <div className="page-intro"><h2>Données macroéconomiques</h2><p>Renseigne chaque publication individuellement. La comparaison réel / prévision est prioritaire ; le précédent donne le contexte et peut avoir été révisé.</p></div>
            <div className="toolbar">
              <div className="search-box"><Activity size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un indicateur..." /></div>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>{categories.map((c) => <option key={c}>{c}</option>)}</select>
              <button className="btn btn-secondary" onClick={() => exportText()}><Download size={16} /> Exporter en TXT</button>
            </div>
            <div className="macro-summary"><span>{filteredIndicators.length} indicateur(s) affiché(s)</span><span>{readyCount} publication(s) avec résultat réel et prévision</span></div>
            <div className="indicator-list">
              {filteredIndicators.map((indicator) => (
                <IndicatorCard key={indicator.id} indicator={indicator} onChange={(key, value) => updateIndicator(indicator.id, key, value)} />
              ))}
            </div>
          </>
        )}

        {activeTab === "structure" && (
          <>
            <div className="page-intro"><h2>Groupe B — Contexte structurel de l'or</h2><p>Ces données sont généralement moins fréquentes que les publications macroéconomiques. Note la source et la date pour éviter de traiter une information ancienne comme actuelle.</p></div>
            <Section title="Banques centrales et ETF" subtitle="Demande structurelle et flux d'investissement." icon={Wallet}>
              <div className="form-grid two">
                <SelectField label="Achats des banques centrales" value={form.centralBanks} onChange={(v) => updateForm("centralBanks", v)} options={[
                  ["unknown", "Non renseigné"], ["supportive", "Achats soutenus / accélération"], ["neutral", "Stables / pas de changement clair"], ["adverse", "Achats en baisse / ralentissement"],
                ]} />
                <TextAreaField label="Source et observations — banques centrales" value={form.centralBanksNote} onChange={(v) => updateForm("centralBanksNote", v)} placeholder="World Gold Council, date, données observées..." rows={3} />
                <SelectField label="Flux des ETF sur l'or" value={form.etfFlows} onChange={(v) => updateForm("etfFlows", v)} options={[
                  ["unknown", "Non renseignés"], ["inflows", "Entrées nettes"], ["neutral", "Flux équilibrés / incertains"], ["outflows", "Sorties nettes"],
                ]} />
                <TextAreaField label="Source et observations — ETF" value={form.etfNote} onChange={(v) => updateForm("etfNote", v)} placeholder="Flux mensuels, région, date, source..." rows={3} />
              </div>
            </Section>
            <Section title="Positionnement et risques" subtitle="Positionnement des traders et demande potentielle de valeur refuge." icon={BarChart3}>
              <div className="form-grid two">
                <SelectField label="Rapport COT — positions nettes longues" value={form.cotPosition} onChange={(v) => updateForm("cotPosition", v)} options={[
                  ["unknown", "Non renseigné"], ["net_long_increasing", "En hausse"], ["neutral", "Stable / mixte"], ["net_long_decreasing", "En baisse"],
                ]} hint="La catégorie et la variation observée doivent être précisées dans les notes." />
                <TextAreaField label="Notes COT" value={form.cotNote} onChange={(v) => updateForm("cotNote", v)} placeholder="Catégorie de traders, semaine, variations, source..." rows={3} />
                <SelectField label="Risques financiers / géopolitiques à moyen terme" value={form.mediumTermRisk} onChange={(v) => updateForm("mediumTermRisk", v)} options={[
                  ["unknown", "Non renseignés"], ["risk_up", "Risques en hausse"], ["neutral", "Stables / incertains"], ["risk_down", "Apaisement"],
                ]} />
                <TextAreaField label="Observations à moyen terme" value={form.mediumTermNote} onChange={(v) => updateForm("mediumTermNote", v)} placeholder="Dette, stress bancaire, conflits, réserves..." rows={3} />
              </div>
            </Section>
            <Section title="Confirmation par le marché de l'or" subtitle="Le contexte technique est séparé de l'analyse fondamentale." icon={TrendingUp}>
              <div className="form-grid two">
                <SelectField label="Structure actuelle de XAUUSD" value={form.goldStructure} onChange={(v) => updateForm("goldStructure", v)} options={[
                  ["unknown", "Non analysée"], ["bullish", "Haussière"], ["bearish", "Baissière"], ["range", "Latérale / indécise"],
                ]} />
                <TextAreaField label="Notes techniques" value={form.goldStructureNote} onChange={(v) => updateForm("goldStructureNote", v)} placeholder="D1/H4 structure, dernier swing, zones D1, OB/FVG H1..." rows={3} />
              </div>
              <p className="helper-paragraph">Un contexte fondamental favorable n'est pas une entrée. La recherche d'OB, de FVG et le choix du risque restent des étapes distinctes de ta méthode technique.</p>
            </Section>
          </>
        )}

        {activeTab === "history" && (
          <>
            <div className="page-intro"><h2>Historique des analyses</h2><p>Les analyses sauvegardées restent dans le stockage local de ce navigateur. Elles ne se synchronisent pas entre appareils.</p></div>
            {history.length === 0 ? (
              <div className="empty-history"><History size={35} /><h3>Aucune analyse sauvegardée</h3><p>Complète tes observations, puis clique sur « Sauvegarder l'analyse ».</p><button className="btn btn-primary" onClick={() => setActiveTab("dashboard")}>Commencer une analyse</button></div>
            ) : (
              <div className="history-list">
                {history.map((item) => (
                  <div className="history-card" key={item.id}>
                    <div className="history-icon"><Archive size={20} /></div>
                    <div className="history-body"><span className="history-date">{item.analysisDate} · {new Date(item.createdAt).toLocaleString("fr-FR")}</span><strong>{item.analysis?.bias || "Analyse enregistrée"}</strong><p>{item.analysis?.interpretation || ""}</p><small>{item.analysis?.indicatorCount || 0} publication(s) saisie(s)</small></div>
                    <div className="history-actions"><button className="btn btn-secondary" onClick={() => loadAnalysis(item)}>Charger</button><button className="btn btn-secondary" onClick={() => exportText(item)}><Download size={15} /></button><button className="icon-button danger" onClick={() => deleteHistory(item.id)} aria-label="Supprimer"><X size={16} /></button></div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <footer className="footer"><span>FUNDAMENTAL LAB <span className="footer-dot">•</span> Version 1.0</span><span>Outil de recherche personnel · XAUUSD</span></footer>
      </main>
    </div>
  );
}
