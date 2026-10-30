import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Map,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  FileText,
  Calendar,
  Layers,
  Award
} from 'lucide-react';
import toast from 'react-hot-toast';
import roadmapService from '../../../services/roadmapService.js';
import ResourceCard from '../components/ResourceCard.jsx';
import ProgressBar from '../../../components/common/ProgressBar.jsx';
import SkillChip from '../../../components/common/SkillChip.jsx';
import Button from '../../../components/common/Button.jsx';
import Card from '../../../components/common/Card.jsx';
import Loader from '../../../components/common/Loader.jsx';

export const RoadmapTimelinePage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const analysisId = searchParams.get('analysisId');
  const remainingGapsOnly = searchParams.get('remainingGapsOnly') === 'true';
  const navigate = useNavigate();

  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState({ 1: true });
  const [swappingMilestone, setSwappingMilestone] = useState(null);

  // Load or generate roadmap
  useEffect(() => {
    const initRoadmap = async () => {
      try {
        setLoading(true);

        if (id) {
          const res = await roadmapService.getRoadmapById(id);
          if (res.success && res.data?.roadmap) {
            setRoadmap(res.data.roadmap);
          }
        } else if (analysisId) {
          setGenerating(true);
          const res = await roadmapService.generateRoadmap(analysisId, remainingGapsOnly);
          if (res.success && res.data?.roadmap) {
            toast.success('Your 12-week roadmap is ready!');
            setRoadmap(res.data.roadmap);
            navigate(`/roadmap/${res.data.roadmap._id}`, { replace: true });
          }
        } else {
          // Fetch latest roadmap
          const res = await roadmapService.getRoadmaps();
          if (res.success && res.data?.roadmaps?.length > 0) {
            setRoadmap(res.data.roadmaps[0]);
          } else {
            navigate('/analysis/new');
          }
        }
      } catch (err) {
        toast.error(err.message || 'Failed to load roadmap.');
      } finally {
        setLoading(false);
        setGenerating(false);
      }
    };

    initRoadmap();
  }, [id, analysisId, remainingGapsOnly, navigate]);

  const toggleWeekExpand = async (weekNumber) => {
    const isExpanding = !expandedWeeks[weekNumber];
    setExpandedWeeks((prev) => ({ ...prev, [weekNumber]: isExpanding }));

    // Lazy resolve resources for this week when opened
    if (isExpanding && roadmap) {
      try {
        const res = await roadmapService.resolveResources(roadmap._id, weekNumber);
        if (res.success && res.data?.week) {
          setRoadmap((prev) => ({
            ...prev,
            weeks: prev.weeks.map((w) => (w.weekNumber === weekNumber ? res.data.week : w))
          }));
        }
      } catch (err) {
        // Soft fail on resolution
      }
    }
  };

  const handleToggleMilestone = async (weekNumber, milestoneIndex, currentCompleted) => {
    if (!roadmap) return;

    try {
      const nextCompleted = !currentCompleted;
      const res = await roadmapService.updateMilestone(
        roadmap._id,
        weekNumber,
        milestoneIndex,
        nextCompleted
      );

      if (res.success) {
        setRoadmap((prev) => ({
          ...prev,
          weeks: prev.weeks.map((w) => {
            if (w.weekNumber === weekNumber) {
              const updatedMilestones = [...w.milestones];
              updatedMilestones[milestoneIndex] = {
                ...updatedMilestones[milestoneIndex],
                completed: nextCompleted,
                completedAt: nextCompleted ? new Date() : null
              };
              return { ...w, milestones: updatedMilestones };
            }
            return w;
          })
        }));
        toast.success(nextCompleted ? 'Milestone completed! Keep going!' : 'Milestone marked incomplete');
      }
    } catch (err) {
      toast.error('Failed to update milestone status.');
    }
  };

  const handleSwapResource = async (weekNumber, milestoneIndex) => {
    if (!roadmap) return;

    try {
      const key = `${weekNumber}-${milestoneIndex}`;
      setSwappingMilestone(key);
      const res = await roadmapService.swapResource(roadmap._id, weekNumber, milestoneIndex);
      if (res.success && res.data?.resource) {
        setRoadmap((prev) => ({
          ...prev,
          weeks: prev.weeks.map((w) => {
            if (w.weekNumber === weekNumber) {
              const updatedMilestones = [...w.milestones];
              updatedMilestones[milestoneIndex] = {
                ...updatedMilestones[milestoneIndex],
                resource: res.data.resource
              };
              return { ...w, milestones: updatedMilestones };
            }
            return w;
          })
        }));
        toast.success('Resource swapped with an alternative!');
      }
    } catch (err) {
      toast.error('Could not swap resource.');
    } finally {
      setSwappingMilestone(null);
    }
  };

  const handleStatusChange = async (weekNumber, milestoneIndex, newStatus) => {
    if (!roadmap) return;

    try {
      const res = await roadmapService.updateResourceStatus(
        roadmap._id,
        weekNumber,
        milestoneIndex,
        newStatus
      );

      if (res.success && res.data?.milestone) {
        setRoadmap((prev) => ({
          ...prev,
          weeks: prev.weeks.map((w) => {
            if (w.weekNumber === weekNumber) {
              const updatedMilestones = [...w.milestones];
              updatedMilestones[milestoneIndex] = res.data.milestone;
              return { ...w, milestones: updatedMilestones };
            }
            return w;
          })
        }));
      }
    } catch (err) {
      toast.error('Failed to update resource status.');
    }
  };

  if (loading || generating) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-6 text-center">
        <Loader
          size="lg"
          text={
            generating
              ? 'Creating your personalized 12-week roadmap with curated resources...'
              : 'Loading roadmap timeline...'
          }
        />
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <h3 className="text-lg font-bold text-slate-800">No Roadmap Found</h3>
        <p className="text-sm text-slate-500 mt-1">Run an analysis first to generate your custom roadmap.</p>
        <Link to="/analysis/new" className="mt-4 inline-block">
          <Button variant="primary">Start Analysis</Button>
        </Link>
      </div>
    );
  }

  // Calculate overall milestone progress
  let totalCount = 0;
  let completedCount = 0;
  roadmap.weeks?.forEach((w) => {
    w.milestones?.forEach((m) => {
      totalCount++;
      if (m.completed) completedCount++;
    });
  });

  const overallPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Roadmap Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 text-indigo-600 font-semibold text-xs mb-1 uppercase tracking-wider">
            <Map className="w-3.5 h-3.5" />
            <span>12-Week Bridge Roadmap</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Roadmap to {roadmap.targetRole}
          </h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>Structured weekly deliverables designed to close your resume skill gaps.</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Re-analysis Loop Button (F10) */}
          <Link
            to={`/analysis/new?roadmapId=${roadmap._id}&previousAnalysisId=${roadmap.analysisId}`}
          >
            <Button variant="outline" size="sm">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Re-analyze with Updated Resume
            </Button>
          </Link>

          {/* ATS Resume Generation Button (F8) */}
          <Link to={`/resume/generate?analysisId=${roadmap.analysisId}`}>
            <Button variant="secondary" size="sm">
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Generate ATS Resume
            </Button>
          </Link>
        </div>
      </div>

      {/* Progress Card */}
      <Card className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white border-none shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-indigo-200">
              <span>Overall Roadmap Completion</span>
              <span className="text-emerald-400 text-sm font-bold">{overallPercent}% Done</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
              <div
                className="bg-emerald-400 h-3 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${overallPercent}%` }}
              />
            </div>
            <div className="flex items-center gap-4 text-xs text-indigo-300">
              <span>✓ {completedCount} of {totalCount} deliverables finished</span>
              <span>•</span>
              <span>12 Weeks Scheduled</span>
            </div>
          </div>

          <div className="flex justify-center md:justify-end">
            <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10 min-w-[130px]">
              <Award className="w-6 h-6 text-amber-400 mx-auto mb-1" />
              <span className="text-xs text-indigo-200">Milestones Done</span>
              <p className="text-2xl font-black text-white">{completedCount}/{totalCount}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* 12-Week Interactive Timeline */}
      <div className="space-y-4">
        {roadmap.weeks?.map((week) => {
          const isExpanded = !!expandedWeeks[week.weekNumber];
          const weekCompletedCount = week.milestones.filter((m) => m.completed).length;
          const isWeekFinished = weekCompletedCount === week.milestones.length;

          return (
            <div
              key={week.weekNumber}
              className={`rounded-2xl border transition-all ${
                isWeekFinished
                  ? 'border-emerald-200 bg-emerald-50/20'
                  : week.weekNumber === 1
                  ? 'border-indigo-300 bg-white shadow-sm ring-1 ring-indigo-50'
                  : 'border-slate-200 bg-white shadow-sm'
              }`}
            >
              {/* Week Header */}
              <button
                type="button"
                onClick={() => toggleWeekExpand(week.weekNumber)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 focus:outline-none"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      isWeekFinished
                        ? 'bg-emerald-500 text-white'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                    }`}
                  >
                    W{week.weekNumber}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 truncate">
                        {week.topicTitle}
                      </h3>
                      {isWeekFinished && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Complete ✓
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xl">
                      {week.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-semibold text-slate-500">
                    {weekCompletedCount}/{week.milestones.length}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Expandable Milestones Content */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-5">
                  {/* Skills Tagged */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-400 mr-1">Skills:</span>
                    {week.skillsCovered?.map((skill) => (
                      <SkillChip key={skill} skill={skill} size="sm" variant="neutral" />
                    ))}
                  </div>

                  {/* Milestones List */}
                  <div className="space-y-4">
                    {week.milestones?.map((milestone, mIdx) => {
                      const swapKey = `${week.weekNumber}-${mIdx}`;
                      const isSwapping = swappingMilestone === swapKey;

                      return (
                        <div
                          key={mIdx}
                          className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-3"
                        >
                          {/* Milestone Title + Checkbox */}
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleMilestone(week.weekNumber, mIdx, milestone.completed)
                              }
                              className="mt-0.5 text-slate-400 hover:text-indigo-600 focus:outline-none transition-colors"
                              title={milestone.completed ? 'Mark incomplete' : 'Mark complete'}
                            >
                              {milestone.completed ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-50" />
                              ) : (
                                <Circle className="w-5 h-5 text-slate-300" />
                              )}
                            </button>
                            <div className="min-w-0 flex-1">
                              <h4
                                className={`text-sm font-semibold ${
                                  milestone.completed
                                    ? 'line-through text-slate-400'
                                    : 'text-slate-800'
                                }`}
                              >
                                {milestone.title}
                              </h4>
                            </div>
                          </div>

                          {/* Curated Resource Card (1 per milestone) */}
                          <div className="pl-8">
                            <ResourceCard
                              resource={milestone.resource}
                              weekNumber={week.weekNumber}
                              milestoneIndex={mIdx}
                              onSwap={handleSwapResource}
                              onStatusChange={handleStatusChange}
                              isSwapping={isSwapping}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RoadmapTimelinePage;

