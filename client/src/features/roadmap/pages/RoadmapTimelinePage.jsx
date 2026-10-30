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
  ArrowLeft,
  RefreshCw,
  FileText,
  Calendar,
  Layers,
  Award,
  TrendingUp,
  Target,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  Link as LinkIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import roadmapService from '../../../services/roadmapService.js';
import analysisService from '../../../services/analysisService.js';
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
  const [availableAnalyses, setAvailableAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState({ 1: true });
  const [swappingMilestone, setSwappingMilestone] = useState(null);

  // Custom milestone additions & edits (User Freedom / Customization)
  const [addingToWeek, setAddingToWeek] = useState(null);
  const [newMilestoneForm, setNewMilestoneForm] = useState({
    title: '',
    resourceType: 'practice',
    resourceName: '',
    resourceUrl: '',
    resourceWhyThis: ''
  });
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const [editingMilestoneKey, setEditingMilestoneKey] = useState(null);
  const [editMilestoneForm, setEditMilestoneForm] = useState({
    title: '',
    resourceType: 'practice',
    resourceName: '',
    resourceUrl: '',
    resourceWhyThis: ''
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [deletingKey, setDeletingKey] = useState(null);

  // Load or generate roadmap
  useEffect(() => {
    const initRoadmap = async () => {
      try {
        setLoading(true);

        const isObjectId = id && id !== 'generate' && id !== 'new' && /^[0-9a-fA-F]{24}$/.test(id);

        if (analysisId) {
          // Generate new roadmap from specified analysis ID
          setGenerating(true);
          const res = await roadmapService.generateRoadmap(analysisId, remainingGapsOnly);
          if (res.success && res.data?.roadmap) {
            toast.success('Your 12-week roadmap is ready!');
            setRoadmap(res.data.roadmap);
            navigate(`/roadmap/${res.data.roadmap._id}`);
          }
        } else if (isObjectId) {
          // Load existing roadmap by specific MongoDB ID
          const res = await roadmapService.getRoadmapById(id);
          if (res.success && res.data?.roadmap) {
            setRoadmap(res.data.roadmap);
          }
        } else {
          // Fetch latest roadmap for this user
          const res = await roadmapService.getRoadmaps();
          if (res.success && res.data?.roadmaps?.length > 0) {
            setRoadmap(res.data.roadmaps[0]);
          } else {
            // No roadmap generated yet: fetch past analyses so user can pick one or create one
            const aRes = await analysisService.getAnalyses();
            if (aRes.success) {
              setAvailableAnalyses(aRes.data?.analyses || []);
            }
            setRoadmap(null);
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

  const handleGenerateRoadmap = async (targetAnalysisId) => {
    try {
      setGenerating(true);
      const res = await roadmapService.generateRoadmap(targetAnalysisId, false);
      if (res.success && res.data?.roadmap) {
        toast.success('Your 12-week roadmap is ready!');
        setRoadmap(res.data.roadmap);
        navigate(`/roadmap/${res.data.roadmap._id}`);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to generate roadmap. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

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

  const handleAddMilestone = async (weekNumber) => {
    if (!newMilestoneForm.title.trim()) {
      toast.error('Please enter a milestone title');
      return;
    }

    try {
      setSubmittingAdd(true);
      const res = await roadmapService.addMilestone(roadmap._id, weekNumber, {
        title: newMilestoneForm.title.trim(),
        resource: {
          type: newMilestoneForm.resourceType,
          name: newMilestoneForm.resourceName.trim() || newMilestoneForm.title.trim(),
          url: newMilestoneForm.resourceUrl.trim(),
          whyThis: newMilestoneForm.resourceWhyThis.trim() || 'Custom milestone deliverable'
        }
      });

      if (res.success && res.data?.week) {
        setRoadmap((prev) => ({
          ...prev,
          weeks: prev.weeks.map((w) => (w.weekNumber === weekNumber ? res.data.week : w))
        }));
        setAddingToWeek(null);
        setNewMilestoneForm({
          title: '',
          resourceType: 'practice',
          resourceName: '',
          resourceUrl: '',
          resourceWhyThis: ''
        });
        toast.success(`Custom step added to Week ${weekNumber}!`);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to add milestone');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleStartEdit = (weekNumber, mIdx, milestone) => {
    const key = `${weekNumber}-${mIdx}`;
    setEditingMilestoneKey(key);
    setEditMilestoneForm({
      title: milestone.title || '',
      resourceType: milestone.resource?.type || 'practice',
      resourceName: milestone.resource?.name || '',
      resourceUrl: milestone.resource?.resolved?.url || '',
      resourceWhyThis: milestone.resource?.whyThis || ''
    });
  };

  const handleSaveEdit = async (weekNumber, mIdx) => {
    if (!editMilestoneForm.title.trim()) {
      toast.error('Milestone title cannot be empty');
      return;
    }

    try {
      setSubmittingEdit(true);
      const res = await roadmapService.updateMilestoneDetails(roadmap._id, weekNumber, mIdx, {
        title: editMilestoneForm.title.trim(),
        resource: {
          type: editMilestoneForm.resourceType,
          name: editMilestoneForm.resourceName.trim() || editMilestoneForm.title.trim(),
          url: editMilestoneForm.resourceUrl.trim(),
          whyThis: editMilestoneForm.resourceWhyThis.trim() || 'Custom milestone deliverable'
        }
      });

      if (res.success && res.data?.milestone) {
        setRoadmap((prev) => ({
          ...prev,
          weeks: prev.weeks.map((w) => {
            if (w.weekNumber === weekNumber) {
              const updatedMilestones = [...w.milestones];
              updatedMilestones[mIdx] = res.data.milestone;
              return { ...w, milestones: updatedMilestones };
            }
            return w;
          })
        }));
        setEditingMilestoneKey(null);
        toast.success('Milestone updated!');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update milestone');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteMilestone = async (weekNumber, mIdx) => {
    const key = `${weekNumber}-${mIdx}`;
    if (!window.confirm('Are you sure you want to delete this step from your roadmap?')) {
      return;
    }

    try {
      setDeletingKey(key);
      const res = await roadmapService.deleteMilestone(roadmap._id, weekNumber, mIdx);
      if (res.success && res.data?.week) {
        setRoadmap((prev) => ({
          ...prev,
          weeks: prev.weeks.map((w) => (w.weekNumber === weekNumber ? res.data.week : w))
        }));
        toast.success('Milestone deleted');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete milestone');
    } finally {
      setDeletingKey(null);
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold tracking-wide uppercase">
            <Map className="w-3.5 h-3.5" />
            <span>12-Week Bridge Roadmap (Feature 5)</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Personalized 12-Week Bridge Roadmap
          </h1>
          <p className="text-base text-slate-600">
            Bridge the gap between your current skills and target job requirements with a week-by-week curriculum and curated single-best resources.
          </p>
        </div>

        {/* Existing Analyses with 1-Click Generation */}
        {availableAnalyses.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Select an Analysis to Build Your Roadmap</h2>
                <p className="text-xs text-slate-500">Pick any past resume analysis to generate a dedicated 12-week study plan.</p>
              </div>
              <Link to="/analysis/new">
                <Button variant="outline" size="sm">
                  + New Analysis
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableAnalyses.map((a) => (
                <Card key={a._id} className="p-5 hover:border-indigo-300 transition-all shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{a.targetRole || 'Target Role Analysis'}</h3>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                        <span>{new Date(a.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                        {a.fileName && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 font-medium text-slate-600 truncate max-w-[160px]">
                              <FileText className="w-3 h-3 text-indigo-500 shrink-0" />
                              <span className="truncate">{a.fileName}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                      <span>Score: {a.matchScore}%</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                    <span className="font-semibold text-rose-600">
                      {a.missingSkills?.length || 0} missing skills
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-emerald-600">
                      {a.matchedSkills?.length || 0} matched
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <Link to={`/analysis/${a._id}`} className="text-xs text-slate-500 hover:text-indigo-600 font-medium">
                      View Analysis →
                    </Link>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleGenerateRoadmap(a._id)}
                      isLoading={generating}
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      Generate Roadmap
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Card className="text-center p-8 bg-gradient-to-b from-indigo-50/50 to-white border-dashed border-2 border-indigo-200">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-md">
              <Map className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-4">No Roadmap Created Yet</h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto mt-2">
              Upload your resume and target job description. CareerPilot's AI will find your missing skills and automatically generate a custom 12-week roadmap.
            </p>
            <div className="mt-6">
              <Link to="/analysis/new">
                <Button variant="primary" size="lg">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze Resume to Build Roadmap
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <Card className="p-5 border-slate-200">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <Layers className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900">Priority-Ordered 12 Weeks</h4>
            <p className="text-xs text-slate-600 mt-1">
              High-importance missing skills are scheduled in weeks 1-4, ensuring you tackle critical job requirements first.
            </p>
          </Card>

          <Card className="p-5 border-slate-200">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900">2-4 Concrete Milestones / Week</h4>
            <p className="text-xs text-slate-600 mt-1">
              Every milestone produces a verifiable deliverable or mini-project to prove practical competency.
            </p>
          </Card>

          <Card className="p-5 border-slate-200">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900">Exactly 1 Curated Resource</h4>
            <p className="text-xs text-slate-600 mt-1">
              No endless search lists. Only the top verified YouTube tutorial, official doc, or practice lab per milestone.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  // Calculate overall milestone progress and current focus week (Feature 7 Merged)
  let totalCount = 0;
  let completedCount = 0;
  let currentFocusWeek = 12;
  let foundIncomplete = false;

  roadmap.weeks?.forEach((w) => {
    let weekHasIncomplete = false;
    w.milestones?.forEach((m) => {
      totalCount++;
      if (m.completed) {
        completedCount++;
      } else {
        weekHasIncomplete = true;
      }
    });

    if (weekHasIncomplete && !foundIncomplete) {
      currentFocusWeek = w.weekNumber;
      foundIncomplete = true;
    }
  });

  const overallPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Navigation Breadcrumbs / Back Button */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-lg shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>← Back</span>
        </button>

        {roadmap?.analysisId && (
          <Link
            to={`/analysis/${roadmap.analysisId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-200 rounded-lg transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Back to Analysis Report</span>
          </Link>
        )}
      </div>

      {/* Roadmap Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 text-indigo-600 font-semibold text-xs mb-1 uppercase tracking-wider">
            <Map className="w-3.5 h-3.5" />
            <span>12-Week Roadmap & Progress Tracker</span>
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
          <Link to={`/resume?analysisId=${roadmap.analysisId}`}>
            <Button variant="secondary" size="sm">
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Generate ATS Resume
            </Button>
          </Link>
        </div>
      </div>

      {/* Integrated Progress & Metric Cards (Merged Feature 7) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Overall Progress */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overall Progress</span>
            <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-3xl font-black text-indigo-600">{overallPercent}%</span>
              <span className="text-xs font-semibold text-slate-400">Target: 100%</span>
            </div>
            <ProgressBar value={overallPercent} max={100} size="sm" color={overallPercent === 100 ? 'emerald' : 'indigo'} />
          </div>
        </div>

        {/* Metric 2: Current Focus Week */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Focus</span>
            <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-slate-900">
              {overallPercent === 100 ? 'All Complete! 🎉' : `Week ${currentFocusWeek}`}
            </p>
            <p className="text-xs text-slate-500 mt-1 truncate max-w-[200px]">
              {overallPercent === 100 ? 'Ready for applications' : (roadmap.weeks?.[currentFocusWeek - 1]?.topicTitle || 'In progress')}
            </p>
          </div>
        </div>

        {/* Metric 3: Milestones Finished */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Milestones Done</span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <p className="text-3xl font-black text-emerald-600">{completedCount}</p>
            <p className="text-xs text-slate-500 mt-1">
              Of {totalCount} verified deliverables finished
            </p>
          </div>
        </div>

        {/* Metric 4: Remaining Deliverables */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Remaining</span>
            <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <p className="text-3xl font-black text-amber-600">{totalCount - completedCount}</p>
            <p className="text-xs text-slate-500 mt-1">
              Deliverables remaining to full role readiness
            </p>
          </div>
        </div>
      </div>

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
                  : week.weekNumber === currentFocusWeek
                  ? 'border-indigo-400 bg-white shadow-md ring-2 ring-indigo-100'
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
                        : week.weekNumber === currentFocusWeek
                        ? 'bg-indigo-600 text-white shadow-sm'
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
                      {isWeekFinished ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Complete ✓
                        </span>
                      ) : week.weekNumber === currentFocusWeek ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                          Current Focus
                        </span>
                      ) : null}
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
                      const isEditing = editingMilestoneKey === swapKey;
                      const isDeleting = deletingKey === swapKey;
                      const isCustom = milestone.resource?.resolved?.channel === 'Custom';

                      if (isEditing) {
                        return (
                          <div
                            key={mIdx}
                            className="p-4 rounded-xl border border-indigo-300 bg-white shadow-sm space-y-3"
                          >
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                                <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                                Edit Step & Resource (Week {week.weekNumber}, Step {mIdx + 1})
                              </span>
                              <button
                                type="button"
                                onClick={() => setEditingMilestoneKey(null)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-slate-700 block">
                                Step Title *
                              </label>
                              <input
                                type="text"
                                value={editMilestoneForm.title}
                                onChange={(e) =>
                                  setEditMilestoneForm({ ...editMilestoneForm, title: e.target.value })
                                }
                                className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                placeholder="e.g. Build REST API for authentication"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                                  Resource Type
                                </label>
                                <select
                                  value={editMilestoneForm.resourceType}
                                  onChange={(e) =>
                                    setEditMilestoneForm({
                                      ...editMilestoneForm,
                                      resourceType: e.target.value
                                    })
                                  }
                                  className="w-full text-xs px-2.5 py-1.5 border rounded-lg border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                >
                                  <option value="practice">Hands-on Practice / Project</option>
                                  <option value="documentation">Official Documentation</option>
                                  <option value="video">Video Tutorial</option>
                                  <option value="article">Article / Deep Dive</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                                  Resource Name
                                </label>
                                <input
                                  type="text"
                                  value={editMilestoneForm.resourceName}
                                  onChange={(e) =>
                                    setEditMilestoneForm({
                                      ...editMilestoneForm,
                                      resourceName: e.target.value
                                    })
                                  }
                                  className="w-full text-xs px-3 py-1.5 border rounded-lg border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                  placeholder="e.g. JWT Auth Complete Guide"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                                  Resource Link / URL (Optional)
                                </label>
                                <input
                                  type="url"
                                  value={editMilestoneForm.resourceUrl}
                                  onChange={(e) =>
                                    setEditMilestoneForm({
                                      ...editMilestoneForm,
                                      resourceUrl: e.target.value
                                    })
                                  }
                                  className="w-full text-xs px-3 py-1.5 border rounded-lg border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                  placeholder="https://..."
                                />
                              </div>
                              <div>
                                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                                  Why This Resource / Note
                                </label>
                                <input
                                  type="text"
                                  value={editMilestoneForm.resourceWhyThis}
                                  onChange={(e) =>
                                    setEditMilestoneForm({
                                      ...editMilestoneForm,
                                      resourceWhyThis: e.target.value
                                    })
                                  }
                                  className="w-full text-xs px-3 py-1.5 border rounded-lg border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                  placeholder="e.g. Delivers auth capability"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => setEditingMilestoneKey(null)}
                                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={submittingEdit || !editMilestoneForm.title.trim()}
                                onClick={() => handleSaveEdit(week.weekNumber, mIdx)}
                                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{submittingEdit ? 'Saving...' : 'Save Changes'}</span>
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={mIdx}
                          className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-3 transition-colors hover:border-slate-300"
                        >
                          {/* Milestone Title + Checkbox + Action Buttons */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleMilestone(week.weekNumber, mIdx, milestone.completed)
                                }
                                className="mt-0.5 text-slate-400 hover:text-indigo-600 focus:outline-none transition-colors shrink-0"
                                title={milestone.completed ? 'Mark incomplete' : 'Mark complete'}
                              >
                                {milestone.completed ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-50" />
                                ) : (
                                  <Circle className="w-5 h-5 text-slate-300" />
                                )}
                              </button>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4
                                    className={`text-sm font-semibold ${
                                      milestone.completed
                                        ? 'line-through text-slate-400'
                                        : 'text-slate-800'
                                    }`}
                                  >
                                    {milestone.title}
                                  </h4>
                                  {isCustom && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                      Custom Step
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Edit & Delete Milestone Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(week.weekNumber, mIdx, milestone)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Edit step title or resource"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => handleDeleteMilestone(week.weekNumber, mIdx)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Delete step"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

                    {/* Add Milestone to Week */}
                    {addingToWeek === week.weekNumber ? (
                      <div className="bg-indigo-50/40 rounded-xl border border-indigo-200 p-4 shadow-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                          <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                            <Plus className="w-3.5 h-3.5 text-indigo-600" />
                            Add Custom Step to Week {week.weekNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => setAddingToWeek(null)}
                            className="text-slate-400 hover:text-slate-600 p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-slate-700 block">
                            Milestone / Step Title *
                          </label>
                          <input
                            type="text"
                            value={newMilestoneForm.title}
                            onChange={(e) =>
                              setNewMilestoneForm({ ...newMilestoneForm, title: e.target.value })
                            }
                            className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                            placeholder="e.g. Build caching layer with Redis"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                              Resource Type
                            </label>
                            <select
                              value={newMilestoneForm.resourceType}
                              onChange={(e) =>
                                setNewMilestoneForm({
                                  ...newMilestoneForm,
                                  resourceType: e.target.value
                                })
                              }
                              className="w-full text-xs px-2.5 py-1.5 border rounded-lg border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                            >
                              <option value="practice">Hands-on Practice / Project</option>
                              <option value="documentation">Official Documentation</option>
                              <option value="video">Video Tutorial</option>
                              <option value="article">Article / Deep Dive</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                              Resource Name (Optional)
                            </label>
                            <input
                              type="text"
                              value={newMilestoneForm.resourceName}
                              onChange={(e) =>
                                setNewMilestoneForm({
                                  ...newMilestoneForm,
                                  resourceName: e.target.value
                                })
                              }
                              className="w-full text-xs px-3 py-1.5 border rounded-lg border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                              placeholder="e.g. Redis Documentation"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                              Resource Link / URL (Optional)
                            </label>
                            <input
                              type="url"
                              value={newMilestoneForm.resourceUrl}
                              onChange={(e) =>
                                setNewMilestoneForm({
                                  ...newMilestoneForm,
                                  resourceUrl: e.target.value
                                })
                              }
                              className="w-full text-xs px-3 py-1.5 border rounded-lg border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                              placeholder="https://..."
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                              Deliverable Note (Optional)
                            </label>
                            <input
                              type="text"
                              value={newMilestoneForm.resourceWhyThis}
                              onChange={(e) =>
                                setNewMilestoneForm({
                                  ...newMilestoneForm,
                                  resourceWhyThis: e.target.value
                                })
                              }
                              className="w-full text-xs px-3 py-1.5 border rounded-lg border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                              placeholder="e.g. Key deliverable to prove proficiency"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-indigo-100">
                          <button
                            type="button"
                            onClick={() => setAddingToWeek(null)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={submittingAdd || !newMilestoneForm.title.trim()}
                            onClick={() => handleAddMilestone(week.weekNumber)}
                            className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{submittingAdd ? 'Adding...' : `Add to Week ${week.weekNumber}`}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setAddingToWeek(week.weekNumber);
                          setNewMilestoneForm({
                            title: '',
                            resourceType: 'practice',
                            resourceName: '',
                            resourceUrl: '',
                            resourceWhyThis: ''
                          });
                        }}
                        className="w-full py-2.5 px-4 rounded-xl border border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50/50 text-indigo-700 text-xs font-semibold flex items-center justify-center gap-2 transition-all group"
                      >
                        <Plus className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
                        <span>+ Add Custom Step to Week {week.weekNumber}</span>
                      </button>
                    )}
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

