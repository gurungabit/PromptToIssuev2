import type {
  GitLabProject,
  GitLabMilestone,
  GitLabGroup,
  GitLabConfig,
  GitLabIssueCreate,
} from '../schemas';

interface GitLabApiResponse<T> {
  data: T;
  headers: Record<string, string>;
  pagination?: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

interface MilestoneCache {
  [projectPath: string]: {
    milestones: GitLabMilestone[];
    timestamp: number;
    ttl: number; // 5 minutes
  };
}

class GitLabClient {
  private baseUrl: string;
  private accessToken: string;
  private milestoneCache: MilestoneCache = {};
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(config: GitLabConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.accessToken = config.accessToken;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<GitLabApiResponse<T>> {
    const url = `${this.baseUrl}/api/v4${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitLab API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Extract pagination info from headers
    const pagination = this.extractPagination(response.headers);

    return {
      data,
      headers: Object.fromEntries(response.headers.entries()),
      pagination,
    };
  }

  private extractPagination(headers: Headers) {
    const totalPages = headers.get('x-total-pages');
    const total = headers.get('x-total');
    const page = headers.get('x-page');
    const perPage = headers.get('x-per-page');

    if (!totalPages || !total || !page || !perPage) {
      return undefined;
    }

    return {
      page: parseInt(page),
      perPage: parseInt(perPage),
      total: parseInt(total),
      totalPages: parseInt(totalPages),
    };
  }

  // Fetch all projects with pagination
  async getAllProjects(search?: string): Promise<GitLabProject[]> {
    const projects: GitLabProject[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        membership: 'true',
        order_by: 'last_activity_at',
        sort: 'desc',
        simple: 'true',
        ...(search && { search }),
      });

      const response = await this.makeRequest<GitLabProject[]>(`/projects?${params}`);
      projects.push(...response.data);

      if (!response.pagination || page >= response.pagination.totalPages) {
        break;
      }
      page++;
    }

    return projects;
  }

  // Get single project by ID
  async getProject(projectId: number): Promise<GitLabProject> {
    const response = await this.makeRequest<GitLabProject>(`/projects/${projectId}`);
    return response.data;
  }

  // Get group hierarchy for a project
  async getGroupHierarchy(projectPath: string): Promise<GitLabGroup[]> {
    const pathParts = projectPath.split('/');
    const groups: GitLabGroup[] = [];

    // Build group path hierarchy (exclude the project name)
    for (let i = 1; i < pathParts.length; i++) {
      const groupPath = pathParts.slice(0, i).join('/');
      if (groupPath) {
        try {
          const response = await this.makeRequest<GitLabGroup>(
            `/groups/${encodeURIComponent(groupPath)}`
          );
          groups.push(response.data);
        } catch (error) {
          console.warn(`Could not fetch group: ${groupPath}`, error);
        }
      }
    }

    return groups;
  }

  // Get all milestones for a project (including parent groups)
  async getAllMilestonesForProject(projectId: number, search?: string): Promise<GitLabMilestone[]> {
    try {
      const project = await this.getProject(projectId);
      const cacheKey = project.path_with_namespace;

      // Check cache first
      if (
        this.milestoneCache[cacheKey] &&
        Date.now() - this.milestoneCache[cacheKey].timestamp < this.CACHE_TTL
      ) {
        let milestones = this.milestoneCache[cacheKey].milestones;

        // Apply search filter if provided
        if (search) {
          milestones = milestones.filter(m => m.title.toLowerCase().includes(search.toLowerCase()));
        }

        return milestones;
      }

      const allMilestones: GitLabMilestone[] = [];

      // Get project milestones
      const projectMilestones = await this.getMilestonesForProject(projectId);
      allMilestones.push(...projectMilestones);

      // Get group hierarchy and their milestones
      const groups = await this.getGroupHierarchy(project.path_with_namespace);
      for (const group of groups) {
        const groupMilestones = await this.getMilestonesForGroup(group.id);
        allMilestones.push(...groupMilestones);
      }

      // Remove duplicates and sort by title
      const uniqueMilestones = allMilestones
        .filter((milestone, index, self) => index === self.findIndex(m => m.id === milestone.id))
        .sort((a, b) => a.title.localeCompare(b.title));

      // Cache the results
      this.milestoneCache[cacheKey] = {
        milestones: uniqueMilestones,
        timestamp: Date.now(),
        ttl: this.CACHE_TTL,
      };

      // Apply search filter
      if (search) {
        return uniqueMilestones.filter(m => m.title.toLowerCase().includes(search.toLowerCase()));
      }

      return uniqueMilestones;
    } catch (error) {
      console.error('Error fetching milestones:', error);
      return [];
    }
  }

  // Get milestones for a specific project
  private async getMilestonesForProject(projectId: number): Promise<GitLabMilestone[]> {
    const milestones: GitLabMilestone[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
      });

      try {
        const response = await this.makeRequest<GitLabMilestone[]>(
          `/projects/${projectId}/milestones?${params}`
        );
        milestones.push(
          ...response.data.map(
            (milestone: {
              id: number;
              title: string;
              description: string | null;
              state: 'active' | 'closed';
              created_at: string;
              updated_at: string;
              due_date: string | null;
              start_date: string | null;
              web_url: string;
              project_id?: number;
              group_id?: number;
            }) => ({
              id: milestone.id,
              title: milestone.title,
              description: milestone.description,
              state: milestone.state,
              created_at: milestone.created_at,
              updated_at: milestone.updated_at,
              due_date: milestone.due_date,
              start_date: milestone.start_date,
              web_url: milestone.web_url,
              project_id: milestone.project_id,
              group_id: milestone.group_id,
            })
          )
        );

        if (!response.pagination || page >= response.pagination.totalPages) {
          break;
        }
        page++;
      } catch (error) {
        console.error(`Error fetching project ${projectId} milestones:`, error);
        break;
      }
    }

    return milestones;
  }

  // Get milestones for a specific group
  private async getMilestonesForGroup(groupId: number): Promise<GitLabMilestone[]> {
    const milestones: GitLabMilestone[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
      });

      try {
        const response = await this.makeRequest<GitLabMilestone[]>(
          `/groups/${groupId}/milestones?${params}`
        );
        milestones.push(
          ...response.data.map(
            (milestone: {
              id: number;
              title: string;
              description: string | null;
              state: 'active' | 'closed';
              created_at: string;
              updated_at: string;
              due_date: string | null;
              start_date: string | null;
              web_url: string;
              project_id?: number;
              group_id?: number;
            }) => ({
              id: milestone.id,
              title: milestone.title,
              description: milestone.description,
              state: milestone.state,
              created_at: milestone.created_at,
              updated_at: milestone.updated_at,
              due_date: milestone.due_date,
              start_date: milestone.start_date,
              web_url: milestone.web_url,
              project_id: milestone.project_id,
              group_id: milestone.group_id,
            })
          )
        );

        if (!response.pagination || page >= response.pagination.totalPages) {
          break;
        }
        page++;
      } catch (error) {
        console.error(`Error fetching group ${groupId} milestones:`, error);
        break;
      }
    }

    return milestones;
  }

  // Create an issue in GitLab
  async createIssue(projectId: number, issue: GitLabIssueCreate): Promise<Record<string, unknown>> {
    const response = await this.makeRequest(`/projects/${projectId}/issues`, {
      method: 'POST',
      body: JSON.stringify(issue),
    });

    return response.data as Record<string, unknown>;
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest('/user');
      return true;
    } catch (error) {
      console.error('GitLab connection test failed:', error);
      return false;
    }
  }

  // Clear milestone cache
  clearMilestoneCache(): void {
    this.milestoneCache = {};
  }

  // Clear cache for specific project
  clearProjectMilestoneCache(projectPath: string): void {
    delete this.milestoneCache[projectPath];
  }
}

export { GitLabClient };
export type { GitLabApiResponse, MilestoneCache };