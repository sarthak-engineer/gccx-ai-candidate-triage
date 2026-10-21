import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowDownUp,
  BrainCircuit,
  Check,
  ChevronDown,
  CircleUserRound,
  Filter,
  LoaderCircle,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tag,
  Users,
  X,
} from "lucide-react";
import { api } from "./api";

const EMPTY_FILTERS = {
  search: "",
  target_role: "",
  source: "",
  min_experience: "",
  max_experience: "",
  skills: [],
  is_shortlisted: "",
};

function initials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function formatDate(value) {
  if (!value) return "Not specified";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Badge({ children, tone = "gray" }) {
  const styles = {
    gray: "bg-gray-100 text-gray-700",
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    purple: "bg-violet-50 text-violet-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${styles[tone] || styles.gray}`}
    >
      {children}
    </span>
  );
}

function Avatar({ name }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-sm font-bold text-emerald-800">
      {initials(name)}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{label}</span>
        <Icon size={18} className="text-emerald-700" />
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-gray-900">
        {value}
      </div>
      <p className="mt-1 text-xs text-gray-500">{detail}</p>
    </div>
  );
}

export default function App() {
  const [metadata, setMetadata] = useState({
    candidate_count: 0,
    roles: [],
    sources: [],
    skills: [],
  });
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [candidates, setCandidates] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(10);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [aiRole, setAiRole] = useState("");
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const loadMetadata = useCallback(async () => {
    try {
      const result = await api.getMetadata();
      setMetadata(result);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const query = {
        ...filters,
        min_experience: filters.min_experience,
        max_experience: filters.max_experience,
        limit,
        offset,
      };

      if (query.is_shortlisted === "") {
        delete query.is_shortlisted;
      } else {
        query.is_shortlisted = filters.is_shortlisted === "true";
      }

      const result = await api.getCandidates(query);
      setCandidates(result.items);
      setTotal(result.total);

      setSelected((current) => {
        if (!current) return current;
        return result.items.find((item) => item.id === current.id) || current;
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, limit, offset]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  function changeFilter(key, value) {
    setOffset(0);
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    setOffset(0);
    setSelected(null);
    setNotice("");
  }

  async function refreshSelected(id) {
    const updated = await api.getCandidate(id);
    setSelected(updated);
    setCandidates((current) =>
      current.map((item) => (item.id === id ? updated : item))
    );
    await loadMetadata();
    return updated;
  }

  async function toggleShortlist(candidate) {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      await api.updateShortlist(candidate.id, !candidate.is_shortlisted);
      await refreshSelected(candidate.id);
      setNotice(
        candidate.is_shortlisted
          ? "Candidate removed from shortlist."
          : "Candidate added to shortlist."
      );
      await loadCandidates();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function addTag(event) {
    event.preventDefault();
    if (!selected || !tagInput.trim()) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await api.addTag(selected.id, tagInput.trim());
      await refreshSelected(selected.id);
      setTagInput("");
      setNotice("Tag added successfully.");
      await loadCandidates();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeTag(tag) {
    if (!selected) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await api.deleteTag(selected.id, tag);
      await refreshSelected(selected.id);
      setNotice("Tag removed.");
      await loadCandidates();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function generateAiSummary() {
    if (!selected || !aiRole.trim()) return;

    setAiLoading(true);
    setAiError("");
    setAiSummary(null);

    try {
      const result = await api.getAiSummary(
        selected.id,
        aiRole.trim()
      );
      setAiSummary(result);
    } catch (err) {
      setAiError(err.message || "Could not generate the AI summary.");
    } finally {
      setAiLoading(false);
    }
  }

  const shortlistedCount = candidates.filter(
    (candidate) => candidate.is_shortlisted
  ).length;

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="min-h-screen bg-[#f6f8f7]">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-800 text-white">
              <Activity size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-gray-900">
                Candidate Triage
              </h1>
              <p className="text-xs text-gray-500">
                Recruiter workspace · GCCX case study
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-600" />
            Connected to local API
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-5 py-7 lg:px-8">
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
              Talent intelligence
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Find the right candidates.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Search candidate profiles, review experience and skills, and
              build a shortlist with evidence you can inspect.
            </p>
          </div>

          <button
            onClick={() => {
              loadMetadata();
              loadCandidates();
            }}
            className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 md:self-auto"
          >
            <Activity size={16} />
            Refresh data
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <span>{error}</span>
            <button
              aria-label="Dismiss error"
              onClick={() => setError("")}
            >
              <X size={18} />
            </button>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            <span className="flex items-center gap-2">
              <Check size={17} />
              {notice}
            </span>
            <button
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
            >
              <X size={17} />
            </button>
          </div>
        )}

        <section className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={Users}
            label="Total candidates"
            value={metadata.candidate_count}
            detail="Imported from the provided dataset"
          />
          <MetricCard
            icon={Star}
            label="Shortlisted on this page"
            value={shortlistedCount}
            detail="Based on the current results"
          />
          <MetricCard
            icon={SlidersHorizontal}
            label="Matching candidates"
            value={total}
            detail="Candidates matching current filters"
          />
          <MetricCard
            icon={Tag}
            label="Available skills"
            value={metadata.skills.length}
            detail="Distinct skills in the dataset"
          />
        </section>

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_370px]">
          <section className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 p-4 sm:p-5">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Candidate directory
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {total} matching {total === 1 ? "candidate" : "candidates"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowFilters((value) => !value)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Filter size={16} />
                    Filters
                    <ChevronDown
                      size={15}
                      className={showFilters ? "rotate-180" : ""}
                    />
                  </button>
                  <button
                    onClick={resetFilters}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                  >
                    Clear all
                  </button>
                </div>
              </div>

              <div className="relative mt-4">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  aria-label="Search candidates"
                  placeholder="Search name, skills, role or candidate notes..."
                  value={filters.search}
                  onChange={(event) =>
                    changeFilter("search", event.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {showFilters && (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="text-xs font-medium text-gray-600">
                    Target role
                    <select
                      value={filters.target_role}
                      onChange={(event) =>
                        changeFilter("target_role", event.target.value)
                      }
                      className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800"
                    >
                      <option value="">All roles</option>
                      {metadata.roles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs font-medium text-gray-600">
                    Application source
                    <select
                      value={filters.source}
                      onChange={(event) =>
                        changeFilter("source", event.target.value)
                      }
                      className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800"
                    >
                      <option value="">All sources</option>
                      {metadata.sources.map((source) => (
                        <option key={source} value={source}>
                          {source}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs font-medium text-gray-600">
                    Shortlist status
                    <select
                      value={filters.is_shortlisted}
                      onChange={(event) =>
                        changeFilter("is_shortlisted", event.target.value)
                      }
                      className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800"
                    >
                      <option value="">All candidates</option>
                      <option value="true">Shortlisted</option>
                      <option value="false">Not shortlisted</option>
                    </select>
                  </label>

                  <label className="text-xs font-medium text-gray-600">
                    Minimum experience (years)
                    <input
                      type="number"
                      min="0"
                      value={filters.min_experience}
                      onChange={(event) =>
                        changeFilter("min_experience", event.target.value)
                      }
                      placeholder="Any"
                      className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                    />
                  </label>

                  <label className="text-xs font-medium text-gray-600">
                    Maximum experience (years)
                    <input
                      type="number"
                      min="0"
                      value={filters.max_experience}
                      onChange={(event) =>
                        changeFilter("max_experience", event.target.value)
                      }
                      placeholder="Any"
                      className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                    />
                  </label>

                  <label className="text-xs font-medium text-gray-600">
                    Required skills (all must match)
                    <select
                      multiple
                      value={filters.skills}
                      onChange={(event) =>
                        changeFilter(
                          "skills",
                          Array.from(
                            event.target.selectedOptions,
                            (option) => option.value
                          )
                        )
                      }
                      className="mt-1.5 min-h-[84px] w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm"
                    >
                      {metadata.skills.map((skill) => (
                        <option key={skill} value={skill}>
                          {skill}
                        </option>
                      ))}
                    </select>
                    <span className="mt-1 block font-normal text-gray-400">
                      Use Ctrl (Windows) to select multiple skills.
                    </span>
                  </label>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-3">Candidate</th>
                    <th className="px-4 py-3">Experience</th>
                    <th className="px-4 py-3">Skills</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center">
                        <LoaderCircle
                          className="mx-auto animate-spin text-emerald-700"
                          size={24}
                        />
                        <p className="mt-3 text-sm text-gray-500">
                          Loading candidates...
                        </p>
                      </td>
                    </tr>
                  ) : candidates.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-16 text-center text-sm text-gray-500"
                      >
                        No candidates match these filters. Try changing your
                        search criteria.
                      </td>
                    </tr>
                  ) : (
                    candidates.map((candidate) => (
                      <tr
                        key={candidate.id}
                        onClick={() => {
                          setSelected(candidate);
                          setAiRole(candidate.target_role);
                          setAiSummary(null);
                          setAiError("");
                        }}
                        className={`cursor-pointer transition hover:bg-emerald-50/40 ${
                          selected?.id === candidate.id
                            ? "bg-emerald-50/70"
                            : ""
                        }`}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={candidate.name} />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-900">
                                {candidate.name}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                {candidate.target_role}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-sm text-gray-700">
                          {candidate.years_experience} yrs
                        </td>

                        <td className="max-w-[210px] px-4 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {candidate.skills.slice(0, 2).map((skill) => (
                              <Badge key={skill} tone="blue">
                                {skill}
                              </Badge>
                            ))}
                            {candidate.skills.length > 2 && (
                              <Badge>+{candidate.skills.length - 2}</Badge>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-sm text-gray-600">
                          {candidate.source}
                        </td>

                        <td className="px-4 py-4">
                          <Badge
                            tone={
                              candidate.is_shortlisted ? "green" : "gray"
                            }
                          >
                            {candidate.is_shortlisted
                              ? "Shortlisted"
                              : "Review"}
                          </Badge>
                        </td>

                        <td className="px-4 py-4">
                          <button
                            disabled={busy}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleShortlist(candidate);
                            }}
                            title={
                              candidate.is_shortlisted
                                ? "Remove from shortlist"
                                : "Add to shortlist"
                            }
                            className={`rounded-lg border p-2 ${
                              candidate.is_shortlisted
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-gray-200 text-gray-500 hover:bg-gray-100"
                            }`}
                          >
                            <Star
                              size={16}
                              fill={
                                candidate.is_shortlisted
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col justify-between gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center">
              <p className="text-xs text-gray-500">
                {total === 0
                  ? "No results"
                  : `Showing ${offset + 1}–${Math.min(offset + candidates.length, total)} of ${total}`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={offset === 0 || loading}
                  onClick={() => setOffset((value) => Math.max(0, value - limit))}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="px-2 text-xs text-gray-500">
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  disabled={offset + limit >= total || loading}
                  onClick={() => setOffset((value) => value + limit)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          </section>

          <aside className="overflow-hidden rounded-2xl border border-gray-200 bg-white xl:sticky xl:top-24">
            {selected ? (
              <>
                <div className="border-b border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-lg font-bold text-emerald-800">
                        {initials(selected.name)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {selected.name}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {selected.target_role}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelected(null)}
                      aria-label="Close candidate details"
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge tone="blue">
                      {selected.years_experience} years experience
                    </Badge>
                    <Badge tone={selected.is_shortlisted ? "green" : "gray"}>
                      {selected.is_shortlisted
                        ? "Shortlisted"
                        : "Not shortlisted"}
                    </Badge>
                  </div>

                  <button
                    disabled={busy}
                    onClick={() => toggleShortlist(selected)}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900"
                  >
                    <Star
                      size={16}
                      fill={selected.is_shortlisted ? "currentColor" : "none"}
                    />
                    {selected.is_shortlisted
                      ? "Remove from shortlist"
                      : "Add to shortlist"}
                  </button>
                </div>

                <div className="space-y-5 p-5">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Skills
                    </h4>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selected.skills.map((skill) => (
                        <Badge key={skill} tone="blue">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Recruiter notes
                    </h4>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                      {selected.notes || "No notes provided."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Source</p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {selected.source}
                      </p>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Applied</p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {formatDate(selected.applied_date)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Recruiter tags
                    </h4>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {selected.tags.length === 0 && (
                        <p className="text-sm text-gray-400">
                          No tags added yet.
                        </p>
                      )}
                      {selected.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white py-1 pl-3 pr-1 text-xs text-gray-700"
                        >
                          {tag}
                          <button
                            disabled={busy}
                            onClick={() => removeTag(tag)}
                            aria-label={`Remove ${tag} tag`}
                            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>

                    <form onSubmit={addTag} className="mt-3 flex gap-2">
                      <input
                        value={tagInput}
                        onChange={(event) => setTagInput(event.target.value)}
                        maxLength={40}
                        placeholder="Add a tag..."
                        className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                      />
                      <button
                        disabled={busy || !tagInput.trim()}
                        type="submit"
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Add
                      </button>
                    </form>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                    <div className="flex items-center gap-2 text-emerald-900">
                      <BrainCircuit size={19} />
                      <h4 className="text-sm font-semibold">AI candidate insights</h4>
                    </div>

                    <p className="mt-2 text-xs leading-5 text-gray-600">
                      Generate an evidence-based assessment for a specific role.
                      The AI uses the candidate's listed skills and notes; the
                      final hiring decision remains with the recruiter.
                    </p>

                    <label className="mt-4 block text-xs font-medium text-gray-700">
                      Role to evaluate
                      <input
                        value={aiRole}
                        onChange={(event) => {
                          setAiRole(event.target.value);
                          setAiSummary(null);
                          setAiError("");
                        }}
                        maxLength={120}
                        placeholder="e.g. Machine Learning Engineer"
                        className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                      />
                    </label>

                    <button
                      type="button"
                      disabled={aiLoading || !aiRole.trim()}
                      onClick={generateAiSummary}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {aiLoading ? (
                        <>
                          <LoaderCircle size={16} className="animate-spin" />
                          Analyzing candidate...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          Generate AI Summary
                        </>
                      )}
                    </button>

                    {aiError && (
                      <p role="alert" className="mt-3 text-sm text-red-700">
                        {aiError}
                      </p>
                    )}

                    {aiSummary && (
                      <div className="mt-4 space-y-3 border-t border-emerald-200 pt-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Fit assessment
                          </span>

                          <Badge
                            tone={
                              aiSummary.fit_assessment === "potential_match"
                                ? "green"
                                : aiSummary.fit_assessment === "partial_match"
                                  ? "amber"
                                  : aiSummary.fit_assessment === "skills_role_mismatch"
                                    ? "purple"
                                    : "gray"
                            }
                          >
                            {aiSummary.fit_assessment.replaceAll("_", " ")}
                          </Badge>
                        </div>

                        <p className="text-sm leading-6 text-gray-800">
                          {aiSummary.summary}
                        </p>

                        <div>
                          <h5 className="text-xs font-semibold text-gray-700">
                            Supporting evidence
                          </h5>

                          {aiSummary.evidence.length > 0 ? (
                            <ul className="mt-2 space-y-2">
                              {aiSummary.evidence.map((item, index) => (
                                <li
                                  key={`${item.source_type}-${index}`}
                                  className="rounded-lg border border-gray-200 bg-white p-3"
                                >
                                  <p className="text-xs leading-5 text-gray-700">
                                    {item.claim}
                                  </p>
                                  <p className="mt-1 text-xs text-gray-500">
                                    Source: {item.source_type} — "{item.source_text}"
                                  </p>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-2 text-xs text-gray-500">
                              No supporting evidence was returned. Review the profile
                              before drawing conclusions.
                            </p>
                          )}
                        </div>

                        <p className="text-xs text-gray-500">
                          Model: {aiSummary.model}
                          {" · "}
                          {aiSummary.cached ? "Cached result" : "Fresh AI result"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex min-h-[420px] flex-col items-center justify-center px-7 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                  <CircleUserRound size={28} />
                </div>
                <h3 className="mt-4 font-semibold text-gray-900">
                  Candidate details
                </h3>
                <p className="mt-2 max-w-[250px] text-sm leading-6 text-gray-500">
                  Select a candidate from the directory to review their skills,
                  notes, application details and shortlist status.
                </p>
                <div className="mt-5 flex items-center gap-2 text-xs text-gray-400">
                  <ArrowDownUp size={14} />
                  Select any row to get started
                </div>
              </div>
            )}
          </aside>
        </div>

        <footer className="mt-7 flex flex-col justify-between gap-2 border-t border-gray-200 py-5 text-xs text-gray-500 sm:flex-row">
          <p>Candidate Triage Workspace · GCCX case study</p>
          <p>Recruiter decisions remain human-led.</p>
        </footer>
      </main>
    </div>
  );
}
