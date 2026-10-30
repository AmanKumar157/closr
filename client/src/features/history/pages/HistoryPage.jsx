import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  History as HistoryIcon,
  GitCompare,
  TrendingUp,
  Map,
  FileText,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Eye,
  RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import toast from 'react-hot-toast';
import analysisService from '../../../services/analysisService.js';
import roadmapService from '../../../services/roadmapService.js';
import resumeService from '../../../services/resumeService.js';
import progressService from '../../../services/progressService.js';
import ScoreGauge from '../../../components/common/ScoreGauge.jsx';
import SkillChip from '../../../components/common/SkillChip.jsx';
import Button from '../../../components/common/Button.jsx';
import Card from '../../../components/common/Card.jsx';
import Loader from '../../../components/common/Loader.jsx';

export const HistoryPage = () => {
  const [activeTab, setActiveTab] = useState('analyses'); // 'analyses' | 'roadmaps' | 'resumes'
  const [analyses, setAnalyses] = useState([]);
  const [roadmaps, setRoadmaps] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Compare selection state (select any two analysis IDs)
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const [aRes, rRes, resRes, pRes] = await Promise.all([
          analysisService.getAnalyses(),
          roadmapService.getRoadmaps(),
          resumeService.getResumes(),
          progressService.getScoreHistory()
        ]);

        if (aRes.success) setAnalyses(aRes.data.analyses || []);
        if (rRes.success) setRoadmaps(rRes.data.roadmaps || []);
        if (resRes.success) setResumes(resRes.data.resumes || []);
        if (pRes.success) {
          const chartData = (pRes.data.scoreHistory || []).map((item, idx) => ({
            name: `Run #${idx + 1}`,
            score: item.matchScore,
            date: new Date(item.date).toLocaleDateString(),
            role: item.targetRole
          }));
          setScoreHistory(chartData);
        }
      } catch (err) {
        toast.error('Failed to load history.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const handleSelectCompare = (id) => {
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(selectedForCompare.filter((item) => item !== id));
      setComparison(null);
    } else {
      if (selectedForCompare.length >= 2) {
        setSelectedForCompare([selectedForCompare[1], id]);
      } else {
        setSelectedForCompare([...selectedForCompare, id]);
      }
      setComparison(null);
    }
  };

  const handleRunComparison = async () => {
    if (selectedForCompare.length !== 2) {
      toast.error('Please select exactly two analyses to compare.');
      return;
    }

    try {
      setComparing(true);
      const res = await analysisService.compareAnalyses(
        selectedForCompare[0],
        selectedForCompare[1]
      );
      if (res.success && res.data?.comparison) {
        setComparison(res.data.comparison);
      }
    } catch (err) {
      toast.error('Could not compare selected analyses.');
    } finally {
      setComparing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <Loader size="lg" text="Loading your history..." />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 text-indigo-600 font-semibold text-xs mb-1 uppercase tracking-wider">
            <HistoryIcon className="w-3.5 h-3.5" />
            <span>Audit Trail & Diff (Feature 9)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            History & Progress Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review past resume versions, compare improvements side-by-side, and track ATS readiness over time.
          </p>
        </div>

        <Link to="/analysis/new">
          <Button variant="primary" size="sm">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            New Resume Analysis
          </Button>
        </Link>
      </div>

      {/* Score-Improvement Progression Chart (Recharts) */}
      {scoreHistory.length > 1 && (
        <Card title="Score Improvement Timeline" subtitle="Track your match score climb across iterative resume updates">
          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scoreHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} unit="%" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg text-xs space-y-1">
                          <p className="font-bold">{data.role}</p>
                          <p className="text-emerald-400 font-semibold">Match Score: {data.score}%</p>
                          <p className="text-slate-400">{data.date}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ r: 6, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 8, fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Side-by-Side Comparison Diff (If Ran) */}
      {comparison && (
        <Card
          title="Side-by-Side Comparison Diff"
          subtitle={`Comparing Run A (${comparison.scoreA}%) vs Run B (${comparison.scoreB}%)`}
          className="border-indigo-300 ring-2 ring-indigo-50 shadow-md"
        >
          <div className="space-y-6">
            {/* Score Delta Highlight */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase">Score Progression</span>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-2xl font-black text-slate-700">{comparison.scoreA}%</span>
                  <ArrowRight className="w-5 h-5 text-slate-400" />
                  <span className="text-2xl font-black text-indigo-600">{comparison.scoreB}%</span>
                </div>
              </div>

              <div
                className={`text-lg font-black px-4 py-2 rounded-xl ${
                  comparison.scoreDelta >= 0
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {comparison.scoreDelta >= 0 ? `+${comparison.scoreDelta}% Improvement` : `${comparison.scoreDelta}%`}
              </div>
            </div>

            {/* Newly Matched Skills */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Newly Matched Skills ({comparison.newlyMatchedSkills?.length || 0})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {comparison.newlyMatchedSkills?.map((s) => (
                    <SkillChip key={s} skill={s} variant="matched" />
                  ))}
                  {(!comparison.newlyMatchedSkills || comparison.newlyMatchedSkills.length === 0) && (
                    <p className="text-xs text-slate-400 italic">No new skills detected between these runs.</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  Resolved Skill Gaps ({comparison.resolvedSkills?.length || 0})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {comparison.resolvedSkills?.map((m) => (
                    <SkillChip key={m.skill} skill={m.skill} variant="matched" />
                  ))}
                  {(!comparison.resolvedSkills || comparison.resolvedSkills.length === 0) && (
                    <p className="text-xs text-slate-400 italic">None resolved yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Optional Re-generate Roadmap Button for remaining gaps */}
            <div className="pt-2 flex justify-end">
              <Link
                to={`/roadmap/generate?analysisId=${comparison.analysisB._id}&remainingGapsOnly=true`}
              >
                <Button variant="primary">
                  <Map className="w-4 h-4 mr-1.5" />
                  Regenerate Roadmap for Remaining Gaps Only
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('analyses')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === 'analyses'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Analyses ({analyses.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('roadmaps')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === 'roadmaps'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Roadmaps ({roadmaps.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('resumes')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === 'resumes'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          ATS Resumes ({resumes.length})
        </button>
      </div>

      {/* Tab 1: Analyses & Compare Selector */}
      {activeTab === 'analyses' && (
        <div className="space-y-4">
          {analyses.length >= 2 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-indigo-900 font-medium">
                Select any 2 analyses below to view a side-by-side skill gap diff and score progression.
                ({selectedForCompare.length} of 2 selected)
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRunComparison}
                disabled={selectedForCompare.length !== 2 || comparing}
                isLoading={comparing}
              >
                <GitCompare className="w-3.5 h-3.5 mr-1.5" />
                Compare Selected (2)
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analyses.map((a) => {
              const isSelected = selectedForCompare.includes(a._id);

              return (
                <div
                  key={a._id}
                  onClick={() => handleSelectCompare(a._id)}
                  className={`p-5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-200 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 truncate mt-0.5">
                        {a.targetRole}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        {a.missingSkills?.length || 0} gaps • {a.matchedSkills?.length || 0} matched skills
                      </p>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-2xl font-black text-indigo-600">{a.matchScore}%</span>
                      <span className="text-[10px] font-semibold text-slate-500">ATS Score</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-600">
                      {isSelected ? '✓ Selected for Compare' : '+ Click to Select'}
                    </span>
                    <Link
                      to={`/analysis/${a._id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Report
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Roadmaps */}
      {activeTab === 'roadmaps' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roadmaps.map((r) => (
            <Link
              key={r._id}
              to={`/roadmap/${r._id}`}
              className="p-5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm transition-all block group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                  <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mt-0.5">
                    {r.targetRole}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {r.weeks?.length || 12} weeks • Curated milestones
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-105 transition-transform">
                  <Map className="w-5 h-5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Tab 3: Resumes */}
      {activeTab === 'resumes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resumes.map((res) => (
            <Link
              key={res._id}
              to={`/resume/${res._id}`}
              className="p-5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm transition-all block group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {new Date(res.createdAt).toLocaleDateString()}
                  </span>
                  <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mt-0.5">
                    ATS Resume #{res._id.slice(-6)}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Ready for PDF download and submission
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;

