"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GitLabClient } from '@/lib/gitlab/client';
import type { GitLabProject, GitLabMilestone, GitLabConfig, Ticket, ProjectSelection } from '@/lib/schemas';
import { 
  Search, 
  X, 
  ExternalLink, 
  Calendar, 
  GitBranch, 
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  GitlabIcon as GitLab,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selection: ProjectSelection) => void;
  tickets: Ticket[];
  gitlabConfig: GitLabConfig;
}

const ProjectSelectionModal: React.FC<ProjectSelectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  tickets,
  gitlabConfig,
}) => {
  const [gitlabClient] = useState(() => new GitLabClient(gitlabConfig));
  
  // State
  const [projects, setProjects] = useState<GitLabProject[]>([]);
  const [milestones, setMilestones] = useState<GitLabMilestone[]>([]);
  const [selectedProject, setSelectedProject] = useState<GitLabProject | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<GitLabMilestone | null>(null);
  const [customProjectId, setCustomProjectId] = useState('');
  
  // Search states
  const [projectSearch, setProjectSearch] = useState('');
  const [milestoneSearch, setMilestoneSearch] = useState('');
  
  // Loading states
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingMilestones, setIsLoadingMilestones] = useState(false);
  const [isRefreshingMilestones, setIsRefreshingMilestones] = useState(false);
  
  // Error states
  const [projectError, setProjectError] = useState<string>('');
  const [milestoneError, setMilestoneError] = useState<string>('');

  const loadProjects = useCallback(async (search?: string) => {
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
  }, [gitlabClient]);

  const loadMilestones = useCallback(async (projectId: number, search?: string) => {
    try {
      setIsLoadingMilestones(true);
      setMilestoneError('');
      const fetchedMilestones = await gitlabClient.getAllMilestonesForProject(projectId, search);
      setMilestones(fetchedMilestones);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load milestones';
      setMilestoneError(errorMessage);
    } finally {
      setIsLoadingMilestones(false);
    }
  }, [gitlabClient]);

  // Load projects on mount
  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen, loadProjects]);

  // Load milestones when project is selected
  useEffect(() => {
    if (selectedProject) {
      loadMilestones(selectedProject.id);
    } else {
      setMilestones([]);
      setSelectedMilestone(null);
    }
  }, [selectedProject, loadMilestones]);

  const handleProjectSearch = (search: string) => {
    setProjectSearch(search);
    if (search.trim()) {
      loadProjects(search);
    } else {
      loadProjects();
    }
  };

  const handleMilestoneSearch = (search: string) => {
    setMilestoneSearch(search);
    if (selectedProject) {
      loadMilestones(selectedProject.id, search);
    }
  };

  const handleMilestoneRefresh = async () => {
    if (!selectedProject) return;
    
    try {
      setIsRefreshingMilestones(true);
      setMilestoneError('');
      
      // Clear cache for this project
      gitlabClient.clearProjectMilestoneCache(selectedProject.path_with_namespace);
      
      // Force reload milestones
      await loadMilestones(selectedProject.id, milestoneSearch);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh milestones';
      setMilestoneError(errorMessage);
    } finally {
      setIsRefreshingMilestones(false);
    }
  };

  const handleCustomProjectSelect = async () => {
    const projectId = parseInt(customProjectId.trim());
    if (isNaN(projectId) || projectId <= 0) {
      setProjectError('Please enter a valid project ID');
      return;
    }

    try {
      setIsLoadingProjects(true);
      setProjectError('');
      const project = await gitlabClient.getProject(projectId);
      setSelectedProject(project);
      // Add to projects list if not already there
      if (!projects.find(p => p.id === project.id)) {
        setProjects(prev => [project, ...prev]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Project not found';
      setProjectError(errorMessage);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedProject) {
      setProjectError('Please select a project');
      return;
    }

    onConfirm({
      projectId: selectedProject.id,
      milestoneId: selectedMilestone?.id,
    });
  };

  const filteredProjects = useCallback(() => {
    if (!projectSearch.trim()) return projects;
    return projects.filter(project =>
      project.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
      project.path_with_namespace.toLowerCase().includes(projectSearch.toLowerCase())
    );
  }, [projects, projectSearch]);

  const filteredMilestones = useCallback(() => {
    if (!milestoneSearch.trim()) return milestones;
    return milestones.filter(milestone =>
      milestone.title.toLowerCase().includes(milestoneSearch.toLowerCase())
    );
  }, [milestones, milestoneSearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background border rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-background">
          <div className="flex items-center gap-3">
            <GitLab className="w-6 h-6 text-orange-500" />
            <div>
              <h2 className="text-xl font-semibold">Create GitLab Issues</h2>
              <p className="text-sm text-muted-foreground">
                Select project and milestone for {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="cursor-pointer hover:bg-accent hover:scale-105 transition-all duration-200"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex h-[600px] bg-background">
          {/* Project Selection */}
          <div className="w-1/2 border-r flex flex-col bg-background">
            <div className="p-4 border-b bg-background">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                Select Project
              </h3>
              
              {/* Search */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search projects..."
                    value={projectSearch}
                    onChange={(e) => handleProjectSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* Custom Project ID */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Or enter project ID..."
                    value={customProjectId}
                    onChange={(e) => setCustomProjectId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCustomProjectSelect()}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={handleCustomProjectSelect}
                    disabled={!customProjectId.trim() || isLoadingProjects}
                    className="cursor-pointer hover:bg-primary/90 hover:shadow-md transition-all duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
                  >
                    {isLoadingProjects ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Add'
                    )}
                  </Button>
                </div>
              </div>

              {projectError && (
                <div className="mt-2 text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {projectError}
                </div>
              )}
            </div>

            {/* Projects List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-background">
              {isLoadingProjects && projects.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                filteredProjects().map((project) => (
                  <div
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md",
                      selectedProject?.id === project.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{project.name}</h4>
                        <p className="text-xs text-muted-foreground truncate">
                          {project.path_with_namespace}
                        </p>
                        {project.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {project.description}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(project.web_url, '_blank');
                        }}
                        className="cursor-pointer p-1 h-auto hover:bg-accent hover:scale-110 transition-all duration-200"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}

              {!isLoadingProjects && filteredProjects().length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No projects found</p>
                </div>
              )}
            </div>
          </div>

          {/* Milestone Selection */}
          <div className="w-1/2 flex flex-col bg-background">
            <div className="p-4 border-b bg-background">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Select Milestone
                <span className="text-xs text-muted-foreground">(Optional)</span>
              </h3>
              
              {selectedProject ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search milestones..."
                        value={milestoneSearch}
                        onChange={(e) => handleMilestoneSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleMilestoneRefresh}
                      disabled={isRefreshingMilestones || isLoadingMilestones}
                      className="cursor-pointer flex items-center gap-2 hover:bg-primary/10 hover:border-primary/50 hover:shadow-md transition-all duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
                      title="Refresh milestones from GitLab"
                    >
                      <RefreshCw className={cn(
                        "w-4 h-4",
                        isRefreshingMilestones && "animate-spin"
                      )} />
                      {isRefreshingMilestones ? "Refreshing..." : "Refresh"}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a project first to load milestones
                </p>
              )}

              {milestoneError && (
                <div className="mt-2 text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {milestoneError}
                </div>
              )}
            </div>

            {/* Milestones List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-background">
              {selectedProject && (
                <div
                  onClick={() => setSelectedMilestone(null)}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md",
                    !selectedMilestone
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="text-sm font-medium">No Milestone</div>
                  <div className="text-xs text-muted-foreground">Create issues without a milestone</div>
                </div>
              )}

              {isLoadingMilestones ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                filteredMilestones().map((milestone) => (
                  <div
                    key={milestone.id}
                    onClick={() => setSelectedMilestone(milestone)}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md",
                      selectedMilestone?.id === milestone.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{milestone.title}</h4>
                        {milestone.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {milestone.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          {milestone.due_date && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(milestone.due_date).toLocaleDateString()}
                            </span>
                          )}
                          <span className={cn(
                            "text-xs px-1.5 py-0.5 rounded-full",
                            milestone.state === 'active' 
                              ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400"
                          )}>
                            {milestone.state}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(milestone.web_url, '_blank');
                        }}
                        className="cursor-pointer p-1 h-auto hover:bg-accent hover:scale-110 transition-all duration-200"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}

              {selectedProject && !isLoadingMilestones && filteredMilestones().length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No active milestones found</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-background flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedProject ? (
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Selected: {selectedProject.path_with_namespace}
                {selectedMilestone && ` → ${selectedMilestone.title}`}
              </span>
            ) : (
              <span>Please select a project to continue</span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="cursor-pointer hover:bg-accent hover:border-border/50 hover:shadow-md transition-all duration-200 hover:scale-105"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedProject}
              className="cursor-pointer hover:bg-primary/90 hover:shadow-lg transition-all duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              Create {tickets.length} Issue{tickets.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export { ProjectSelectionModal }; 