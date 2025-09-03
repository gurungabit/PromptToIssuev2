import { GitLabClient } from '../lib/gitlab/client';
import type { 
  Ticket, 
  GitLabConfig, 
  ProjectSelection, 
  MultiProjectSelection, 
  GitLabIssueCreate 
} from '../lib/schemas';
import type { Context } from 'hono';

interface CreateIssuesRequest {
  tickets: Ticket[];
  projectSelection: ProjectSelection;
  gitlabConfig: GitLabConfig;
}

interface CreateIssuesMultiRequest {
  tickets: Ticket[];
  multiProjectSelection: MultiProjectSelection;
  gitlabConfig: GitLabConfig;
}

// GET /gitlab/create-issues - Health check for create-issues endpoint
export const gitlabCreateIssuesGet = (c: Context) => {
  return c.json({ message: 'GitLab create-issues endpoint is running' });
};

// POST /gitlab/create-issues - Create issues in a single project
export const gitlabCreateIssues = async (c: Context) => {
  try {
    const body: CreateIssuesRequest = await c.req.json();
    const { tickets, projectSelection, gitlabConfig } = body;

    // Validate required fields
    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return c.json({ error: 'No tickets provided' }, 400);
    }

    if (!projectSelection || !projectSelection.projectId) {
      return c.json({ error: 'Project selection is required' }, 400);
    }

    if (!gitlabConfig || !gitlabConfig.baseUrl || !gitlabConfig.accessToken) {
      return c.json({ error: 'GitLab configuration is incomplete' }, 400);
    }

    // Initialize GitLab client
    const gitlabClient = new GitLabClient(gitlabConfig);

    // Test connection first
    const isConnected = await gitlabClient.testConnection();
    if (!isConnected) {
      return c.json(
        { error: 'Unable to connect to GitLab. Please check your configuration.' },
        400
      );
    }

    const createdIssues: Array<{ ticket: Ticket; issue: Record<string, unknown> }> = [];
    const errors: Array<{ ticket: Ticket; error: string }> = [];

    // Create issues for each ticket
    for (const ticket of tickets) {
      try {
        // Build issue description with acceptance criteria, tasks, and metadata
        let issueDescription = ticket.description;

        if (ticket.acceptanceCriteria && ticket.acceptanceCriteria.length > 0) {
          issueDescription += '\n\n## Acceptance Criteria\n';
          ticket.acceptanceCriteria.forEach((criterion, index) => {
            issueDescription += `${index + 1}. ${criterion.description}\n`;
          });
        }

        if (ticket.tasks && ticket.tasks.length > 0) {
          issueDescription += '\n## Tasks\n';
          ticket.tasks.forEach(task => {
            issueDescription += `- [ ] ${task.description}\n`;
          });
        }

        // Add metadata
        issueDescription += `\n---\n**Priority:** ${ticket.priority}\n`;
        issueDescription += `**Type:** ${ticket.type}\n`;
        if (ticket.estimatedHours) {
          issueDescription += `**Estimated Hours:** ${ticket.estimatedHours}\n`;
        }

        const issueData: GitLabIssueCreate = {
          title: ticket.title,
          description: issueDescription,
          labels: ticket.labels || [],
        };

        // Add milestone if selected
        if (projectSelection.milestoneId) {
          issueData.milestone_id = projectSelection.milestoneId;
        }

        const createdIssue = await gitlabClient.createIssue(projectSelection.projectId, issueData);
        createdIssues.push({ ticket, issue: createdIssue });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to create issue for ticket ${ticket.id}:`, errorMessage);
        errors.push({ ticket, error: errorMessage });
      }
    }

    const response = {
      success: errors.length === 0,
      created: createdIssues.length,
      total: tickets.length,
      issues: createdIssues,
      errors,
      message:
        errors.length === 0
          ? `Successfully created ${createdIssues.length} issue${createdIssues.length !== 1 ? 's' : ''}`
          : `Created ${createdIssues.length} of ${tickets.length} issues. ${errors.length} failed.`,
    };

    return c.json(response);
  } catch (error) {
    console.error('GitLab issue creation error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return c.json(
      {
        success: false,
        error: `Failed to create GitLab issues: ${errorMessage}`,
        created: 0,
        total: 0,
      },
      500
    );
  }
};

// GET /gitlab/create-issues-multi - Health check for create-issues-multi endpoint
export const gitlabCreateIssuesMultiGet = (c: Context) => {
  return c.json({ message: 'GitLab create-issues-multi endpoint is running' });
};

// POST /gitlab/create-issues-multi - Create issues across multiple projects
export const gitlabCreateIssuesMulti = async (c: Context) => {
  try {
    const body: CreateIssuesMultiRequest = await c.req.json();
    const { tickets, multiProjectSelection, gitlabConfig } = body;

    // Validate required fields
    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return c.json({ error: 'No tickets provided' }, 400);
    }

    if (
      !multiProjectSelection ||
      !multiProjectSelection.tickets ||
      multiProjectSelection.tickets.length === 0
    ) {
      return c.json({ error: 'Multi-project selection is required' }, 400);
    }

    if (!gitlabConfig || !gitlabConfig.baseUrl || !gitlabConfig.accessToken) {
      return c.json({ error: 'GitLab configuration is incomplete' }, 400);
    }

    // Validate that all tickets have project selections
    const ticketSelectionMap = new Map(
      multiProjectSelection.tickets.map(selection => [selection.ticketId, selection])
    );

    const missingSelections = tickets.filter(ticket => !ticketSelectionMap.has(ticket.id));
    if (missingSelections.length > 0) {
      return c.json({
        error: `Missing project selections for tickets: ${missingSelections
          .map(t => t.id)
          .join(', ')}`,
      }, 400);
    }

    // Initialize GitLab client
    const gitlabClient = new GitLabClient(gitlabConfig);

    // Test connection first
    const isConnected = await gitlabClient.testConnection();
    if (!isConnected) {
      return c.json(
        { error: 'Unable to connect to GitLab. Please check your configuration.' },
        400
      );
    }

    const results: Record<number, {
      projectId: number;
      createdIssues: Array<{ ticket: Ticket; issue: Record<string, unknown> }>;
      errors: Array<{ ticket: Ticket; error: string }>;
    }> = {};

    let totalCreated = 0;
    let totalErrors = 0;

    // Group tickets by project and create issues
    for (const ticket of tickets) {
      const selection = ticketSelectionMap.get(ticket.id)!;
      const projectId = selection.projectId;

      // Initialize project results if not exists
      if (!results[projectId]) {
        results[projectId] = {
          projectId,
          createdIssues: [],
          errors: [],
        };
      }

      try {
        // Build issue description with acceptance criteria, tasks, and metadata
        let issueDescription = ticket.description;

        if (ticket.acceptanceCriteria && ticket.acceptanceCriteria.length > 0) {
          issueDescription += '\n\n## Acceptance Criteria\n';
          ticket.acceptanceCriteria.forEach((criterion, index) => {
            issueDescription += `${index + 1}. ${criterion.description}\n`;
          });
        }

        if (ticket.tasks && ticket.tasks.length > 0) {
          issueDescription += '\n## Tasks\n';
          ticket.tasks.forEach(task => {
            issueDescription += `- [ ] ${task.description}\n`;
          });
        }

        // Add metadata
        issueDescription += `\n---\n**Priority:** ${ticket.priority}\n`;
        issueDescription += `**Type:** ${ticket.type}\n`;
        if (ticket.estimatedHours) {
          issueDescription += `**Estimated Hours:** ${ticket.estimatedHours}\n`;
        }

        const issueData: GitLabIssueCreate = {
          title: ticket.title,
          description: issueDescription,
          labels: ticket.labels || [],
        };

        // Add milestone if selected
        if (selection.milestoneId) {
          issueData.milestone_id = selection.milestoneId;
        }

        const createdIssue = await gitlabClient.createIssue(projectId, issueData);
        results[projectId].createdIssues.push({ ticket, issue: createdIssue });
        totalCreated++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to create issue for ticket ${ticket.id} in project ${projectId}:`, errorMessage);
        results[projectId].errors.push({ ticket, error: errorMessage });
        totalErrors++;
      }
    }

    const response = {
      success: totalErrors === 0,
      created: totalCreated,
      total: tickets.length,
      results: Object.values(results),
      message:
        totalErrors === 0
          ? `Successfully created ${totalCreated} issue${totalCreated !== 1 ? 's' : ''} across ${Object.keys(results).length} project${Object.keys(results).length !== 1 ? 's' : ''}`
          : `Created ${totalCreated} of ${tickets.length} issues across ${Object.keys(results).length} project${Object.keys(results).length !== 1 ? 's' : ''}. ${totalErrors} failed.`,
    };

    return c.json(response);
  } catch (error) {
    console.error('GitLab multi-project issue creation error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return c.json(
      {
        success: false,
        error: `Failed to create GitLab issues: ${errorMessage}`,
        created: 0,
        total: 0,
      },
      500
    );
  }
};