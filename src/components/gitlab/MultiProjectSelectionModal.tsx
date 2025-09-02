'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dropdown } from '@/components/ui/Dropdown';
import { SearchableDropdown } from '@/components/ui/SearchableDropdown';
import { Modal } from '@/components/ui/Modal';
import { GitLabClient } from '@/lib/gitlab/client';
import type {
  GitLabProject,
  GitLabMilestone,
  GitLabConfig,
  Ticket,
  MultiProjectSelection,
  TicketProjectSelection,
} from '@/lib/schemas';
import {
  Search,
  GitBranch,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  GitlabIcon as GitLab,
  Copy,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiProjectSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selection: MultiProjectSelection) => void;
  tickets: Ticket[];
  gitlabConfig: GitLabConfig;
}

const MultiProjectSelectionModal: React.FC<MultiProjectSelectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  tickets,
  gitlabConfig,
}) => {
  const [gitlabClient] = useState(() => new GitLabClient(gitlabConfig));

  // State
  const [projects, setProjects] = useState<GitLabProject[]>([]);
  const [allMilestones, setAllMilestones] = useState<Record<number, GitLabMilestone[]>>({});
  const [ticketSelections, setTicketSelections] = useState<Record<string, TicketProjectSelection>>(
    {}
  );

  // Search states
  const [projectSearch, setProjectSearch] = useState('');
  const [milestoneSearch, setMilestoneSearch] = useState('');

  // Loading states
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [loadingMilestones, setLoadingMilestones] = useState<Set<number>>(new Set());

  // Error states
  const [projectError, setProjectError] = useState<string>('');

  // UI state
  const [defaultProject, setDefaultProject] = useState<GitLabProject | null>(null);
  const [defaultMilestone, setDefaultMilestone] = useState<GitLabMilestone | null>(null);

  const loadProjects = useCallback(
    async (search?: string) => {
      try {
        setIsLoadingProjects(true);
        setProjectError('');
        const fetchedProjects = await gitlabClient.getAllProjects(search);
        setProjects(fetchedProjects);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load projects';
        setProjectError(errorMessage);
      } finally {
        setIsLoadingProjects(false);
      }
    },
    [gitlabClient]
  );

  const loadMilestones = useCallback(
    async (projectId: number) => {
      if (allMilestones[projectId]) return; // Already loaded

      try {
        setLoadingMilestones(prev => new Set(prev).add(projectId));
        const fetchedMilestones = await gitlabClient.getAllMilestonesForProject(projectId);
        setAllMilestones(prev => ({ ...prev, [projectId]: fetchedMilestones }));
      } catch (error) {
        console.error(`Failed to load milestones for project ${projectId}:`, error);
      } finally {
        setLoadingMilestones(prev => {
          const newSet = new Set(prev);
          newSet.delete(projectId);
          return newSet;
        });
      }
    },
    [gitlabClient, allMilestones]
  );

  // Initialize with default selections
  useEffect(() => {
    if (isOpen && defaultProject) {
      const initialSelections: Record<string, TicketProjectSelection> = {};
      tickets.forEach(ticket => {
        initialSelections[ticket.id] = {
          ticketId: ticket.id,
          projectId: defaultProject.id,
          milestoneId: defaultMilestone?.id,
        };
      });
      setTicketSelections(initialSelections);
    }
  }, [isOpen, tickets, defaultProject, defaultMilestone]);

  // Load projects on mount
  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen, loadProjects]);

  const handleProjectSearch = (search: string) => {
    setProjectSearch(search);
    if (search.trim()) {
      loadProjects(search);
    } else {
      loadProjects();
    }
  };

  const applyDefaultToAll = () => {
    if (!defaultProject) return;

    const newSelections: Record<string, TicketProjectSelection> = {};
    tickets.forEach(ticket => {
      newSelections[ticket.id] = {
        ticketId: ticket.id,
        projectId: defaultProject.id,
        milestoneId: defaultMilestone?.id,
      };
    });
    setTicketSelections(newSelections);
  };

  const updateTicketSelection = (ticketId: string, updates: Partial<TicketProjectSelection>) => {
    setTicketSelections(prev => ({
      ...prev,
      [ticketId]: {
        ...prev[ticketId],
        ...updates,
        ticketId,
      },
    }));
  };

  const handleProjectChange = (ticketId: string, projectId: number) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      updateTicketSelection(ticketId, { projectId, milestoneId: undefined });
      loadMilestones(projectId);
    }
  };

  const handleMilestoneChange = (ticketId: string, milestoneId?: number) => {
    updateTicketSelection(ticketId, { milestoneId });
  };

  const handleConfirm = () => {
    const allSelected = tickets.every(ticket => ticketSelections[ticket.id]?.projectId);
    if (!allSelected) {
      setProjectError('Please select a project for all tickets');
      return;
    }

    onConfirm({
      tickets: tickets.map(ticket => ticketSelections[ticket.id]),
    });
  };

  const filteredProjects = useCallback(() => {
    if (!projectSearch.trim()) return projects;
    return projects.filter(
      project =>
        project.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
        project.path_with_namespace.toLowerCase().includes(projectSearch.toLowerCase())
    );
  }, [projects, projectSearch]);

  const filteredMilestones = useCallback(
    (projectId: number) => {
      const projectMilestones = allMilestones[projectId] || [];
      if (!milestoneSearch.trim()) return projectMilestones;
      return projectMilestones.filter(milestone =>
        milestone.title.toLowerCase().includes(milestoneSearch.toLowerCase())
      );
    },
    [allMilestones, milestoneSearch]
  );

  const getProjectById = (projectId: number) => projects.find(p => p.id === projectId);
  const getMilestoneById = (projectId: number, milestoneId?: number) =>
    milestoneId ? allMilestones[projectId]?.find(m => m.id === milestoneId) : undefined;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="Create GitLab Issues"
      subtitle={`Configure project and milestone for each of the ${tickets.length} ticket${tickets.length !== 1 ? 's' : ''}`}
      icon={<GitLab className="w-6 h-6 text-orange-500" />}
    >

      <div className="flex flex-1 min-h-0">
        {/* Default Settings Sidebar */}
        <div className="w-1/3 border-r border-border bg-muted/50 p-4">
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Default Settings
              </h3>

              {/* Project Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">Default Project</label>
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search projects..."
                      value={projectSearch}
                      onChange={e => handleProjectSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {projectError && (
                    <div className="text-sm text-red-600 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {projectError}
                    </div>
                  )}
                  <div className="max-h-32 overflow-y-auto border rounded-md">
                    {isLoadingProjects ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      filteredProjects()
                        .slice(0, 5)
                        .map(project => (
                          <div
                            key={project.id}
                            onClick={() => {
                              setDefaultProject(project);
                              loadMilestones(project.id);
                            }}
                            className={cn(
                              'p-2 cursor-pointer hover:bg-accent text-sm',
                              defaultProject?.id === project.id &&
                                'bg-primary/10 border-l-2 border-primary'
                            )}
                          >
                            <div className="font-medium truncate">{project.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {project.path_with_namespace}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>

              {/* Milestone Selection */}
              {defaultProject && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Default Milestone</label>
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search milestones..."
                        value={milestoneSearch}
                        onChange={e => setMilestoneSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div
                      onClick={() => setDefaultMilestone(null)}
                      className={cn(
                        'p-2 cursor-pointer hover:bg-accent text-sm border rounded',
                        !defaultMilestone && 'bg-primary/10 border-primary'
                      )}
                    >
                      No Milestone
                    </div>
                    {loadingMilestones.has(defaultProject.id) ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      filteredMilestones(defaultProject.id).slice(0, 10).map(milestone => (
                        <div
                          key={milestone.id}
                          onClick={() => setDefaultMilestone(milestone)}
                          className={cn(
                            'p-2 cursor-pointer hover:bg-accent text-sm border rounded',
                            defaultMilestone?.id === milestone.id && 'bg-primary/10 border-primary'
                          )}
                        >
                          <div className="font-medium truncate">{milestone.title}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            {milestone.due_date && (
                              <>
                                <Clock className="w-3 h-3" />
                                {new Date(milestone.due_date).toLocaleDateString()}
                              </>
                            )}
                            <span
                              className={cn(
                                'px-1 py-0.5 rounded text-xs',
                                milestone.state === 'active' &&
                                  milestone.due_date &&
                                  new Date(milestone.due_date) > new Date()
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                  : milestone.state === 'active'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
                              )}
                            >
                              {milestone.state === 'active' &&
                              milestone.due_date &&
                              new Date(milestone.due_date) > new Date()
                                ? 'upcoming'
                                : milestone.state}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Apply Default Button */}
              <Button
                onClick={applyDefaultToAll}
                disabled={!defaultProject}
                className="w-full cursor-pointer hover:bg-primary/90 hover:shadow-md transition-all duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
              >
                <Copy className="w-4 h-4 mr-2" />
                Apply to All Tickets
              </Button>
            </div>
          </div>

          {/* Tickets Configuration */}
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              Ticket Configuration
            </h3>

            <div className="space-y-4">
              {tickets.map(ticket => {
                const selection = ticketSelections[ticket.id];
                const selectedProject = selection ? getProjectById(selection.projectId) : null;
                const selectedMilestone = selection
                  ? getMilestoneById(selection.projectId, selection.milestoneId)
                  : null;
                const projectMilestones = selection ? filteredMilestones(selection.projectId) : [];

                return (
                  <div key={ticket.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{ticket.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {ticket.description}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Project Selection */}
                      <div>
                        <label className="text-xs font-medium mb-1 block">Project</label>
                        <SearchableDropdown
                          value={selection?.projectId?.toString() || ''}
                          options={[
                            { value: '', label: 'Select project...' },
                            ...projects.map(project => ({
                              value: project.id.toString(),
                              label: `${project.name} (${project.path_with_namespace})`,
                            })),
                          ]}
                          onChange={value =>
                            value && handleProjectChange(ticket.id, parseInt(value))
                          }
                          placeholder="Select project..."
                          searchPlaceholder="Search projects..."
                          size="sm"
                        />
                      </div>

                      {/* Milestone Selection */}
                      <div>
                        <label className="text-xs font-medium mb-1 block">Milestone</label>
                        <SearchableDropdown
                          value={selection?.milestoneId?.toString() || ''}
                          options={[
                            { value: '', label: 'No milestone' },
                            ...(selection ? allMilestones[selection.projectId] || [] : []).map(milestone => ({
                              value: milestone.id.toString(),
                              label: `${milestone.title}${
                                milestone.due_date
                                  ? ` (${new Date(milestone.due_date).toLocaleDateString()})`
                                  : ''
                              }`,
                            })),
                          ]}
                          onChange={value =>
                            handleMilestoneChange(ticket.id, value ? parseInt(value) : undefined)
                          }
                          disabled={
                            !selectedProject ||
                            (selection && loadingMilestones.has(selection.projectId))
                          }
                          placeholder="No milestone"
                          searchPlaceholder="Search milestones..."
                          size="sm"
                        />
                        {selection && loadingMilestones.has(selection.projectId) && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Loading milestones...
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Selection Summary */}
                    {selectedProject && (
                      <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          <span>
                            {selectedProject.path_with_namespace}
                            {selectedMilestone && ` → ${selectedMilestone.title}`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      {/* Footer */}
      <div className="flex justify-between items-center gap-3 p-4 border-t border-border">
        <div className="text-sm text-muted-foreground">
          {tickets.filter(t => ticketSelections[t.id]?.projectId).length} of {tickets.length}{' '}
          tickets configured
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="cursor-pointer hover:bg-accent hover:border-accent-foreground hover:scale-105 hover:shadow-md transition-all duration-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={tickets.some(t => !ticketSelections[t.id]?.projectId)}
            className="cursor-pointer bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary hover:scale-105 hover:shadow-lg transition-all duration-200 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
          >
            Create {tickets.length} Issue{tickets.length !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export { MultiProjectSelectionModal };
