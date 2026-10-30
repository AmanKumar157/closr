import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Map,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  Award
} from 'lucide-react';
import progressService from '../../../services/progressService.js';
import roadmapService from '../../../services/roadmapService.js';
import ProgressBar from '../../../components/common/ProgressBar.jsx';
import Card from '../../../components/common/Card.jsx';
import Button from '../../../components/common/Button.jsx';
import Loader from '../../../components/common/Loader.jsx';

export const TrackerPage = () => {
  const [summary, setSummary] = useState(null);
  const [activeRoadmap, setActiveRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        setLoading(true);
        const res = await progressService.getProgressSummary();
        if (res.success && res.data) {
          setSummary(res.data);
          if (res.data.activeRoadmapId) {
            const rRes = await roadmapService.getRoadmapById(res.data.activeRoadmapId);
            if (rRes.success) {
              setActiveRoadmap(rRes.data.roadmap);
            }
          }
        }
      } catch (err) {
        // Soft fail
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <Loader size="lg" text="Loading progress tracker..." />
      </div>
    );
  }

  if (!summary || !summary.hasRoadmap) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
          <TrendingUp className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">No Active Roadmap Tracked</h3>
        <p className="text-sm text-slate-500">
          Upload your resume and generate your first 12-week roadmap to start tracking your learning progress.
        </p>
        <Link to="/analysis/new" className="inline-block pt-2">
          <Button variant="primary">
            Start Skill-Gap Analysis
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Tracker Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 text-indigo-600 font-semibold text-xs mb-1 uppercase tracking-wider">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Progress Tracker (Feature 7)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Learning Progress & Milestone Tracker
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tracking your progress toward {summary.targetRole}.
          </p>
        </div>

        <Link to={`/roadmap/${summary.activeRoadmapId}`}>
          <Button variant="primary" size="sm">
            <Map className="w-3.5 h-3.5 mr-1.5" />
            Open Full 12-Week Roadmap
          </Button>
        </Link>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overall Progress</span>
          <p className="text-3xl font-black text-indigo-600 mt-2">{summary.overallPercentage}%</p>
          <ProgressBar value={summary.overallPercentage} max={100} size="sm" color="indigo" className="mt-2" />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Focus Week</span>
          <p className="text-3xl font-black text-slate-900 mt-2">Week {summary.currentWeek}</p>
          <p className="text-xs text-slate-500 mt-1">Of 12 total structured weeks</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Milestones Completed</span>
          <p className="text-3xl font-black text-emerald-600 mt-2">{summary.completedMilestones}</p>
          <p className="text-xs text-slate-500 mt-1">Deliverables completed</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Remaining Tasks</span>
          <p className="text-3xl font-black text-amber-600 mt-2">
            {summary.totalMilestones - summary.completedMilestones}
          </p>
          <p className="text-xs text-slate-500 mt-1">Deliverables in roadmap</p>
        </div>
      </div>

      {/* Week-by-Week Progress Table / Grid */}
      <Card title="Week-by-Week Milestone Breakdown" subtitle="Monitor your completion percentage across all 12 weeks">
        <div className="space-y-4">
          {activeRoadmap?.weeks?.map((w) => {
            const wDone = w.milestones.filter((m) => m.completed).length;
            const wTotal = w.milestones.length;
            const wPct = wTotal > 0 ? Math.round((wDone / wTotal) * 100) : 0;
            const isCurrent = w.weekNumber === summary.currentWeek;

            return (
              <div
                key={w.weekNumber}
                className={`p-4 rounded-xl border transition-all ${
                  isCurrent
                    ? 'border-indigo-400 bg-indigo-50/30 ring-1 ring-indigo-200'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        wPct === 100
                          ? 'bg-emerald-500 text-white'
                          : isCurrent
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      W{w.weekNumber}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{w.topicTitle}</h4>
                      <p className="text-xs text-slate-500">{w.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    {isCurrent && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                        Current Week
                      </span>
                    )}
                    <span className="font-semibold text-slate-700">{wDone}/{wTotal} Done</span>
                    <span className="font-bold text-indigo-600">{wPct}%</span>
                  </div>
                </div>

                <ProgressBar value={wPct} max={100} size="sm" color={wPct === 100 ? 'emerald' : 'indigo'} />
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default TrackerPage;
