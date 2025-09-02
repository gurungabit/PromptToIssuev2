import { NextRequest, NextResponse } from 'next/server';
import { GitLabClient } from '@/lib/gitlab/client';
import type { Ticket, GitLabConfig, MultiProjectSelection, GitLabIssueCreate } from '@/lib/schemas';

interface CreateIssuesMultiRequest {
  tickets: Ticket[];
  multiProjectSelection: MultiProjectSelection;
  gitlabConfig: GitLabConfig;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateIssuesMultiRequest = await request.json();
    const { tickets, multiProjectSelection, gitlabConfig } = body;

    // Validate required fields
    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return NextResponse.json({ error: 'No tickets provided' }, { status: 400 });
    }

    if (
      !multiProjectSelection ||
      !multiProjectSelection.tickets ||
      multiProjectSelection.tickets.length === 0
    ) {
      return NextResponse.json({ error: 'Multi-project selection is required' }, { status: 400 });
    }

    if (!gitlabConfig || !gitlabConfig.baseUrl || !gitlabConfig.accessToken) {
      return NextResponse.json({ error: 'GitLab configuration is incomplete' }, { status: 400 });
    }

    // Validate that all tickets have project selections
    const ticketSelectionMap = new Map(
      multiProjectSelection.tickets.map(selection => [selection.ticketId, selection])
    );

    const missingSelections = tickets.filter(ticket => !ticketSelectionMap.has(ticket.id));
    if (missingSelections.length > 0) {
      return NextResponse.json(
        {
          error: `Missing project selections for tickets: ${missingSelections.map(t => t.title).join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Initialize GitLab client
    const gitlabClient = new GitLabClient(gitlabConfig);

    // Test connection first
    const isConnected = await gitlabClient.testConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Failed to connect to GitLab. Please check your configuration.' },
        { status: 401 }
      );
    }

    const createdIssues = [];
    const errors = [];

    // Create issues one by one with their respective project selections
    for (const ticket of tickets) {
      try {
        const selection = ticketSelectionMap.get(ticket.id);
        if (!selection) {
          errors.push({
            ticketId: ticket.id,
            title: ticket.title,
            error: 'No project selection found for this ticket',
          });
          continue;
        }

        // Convert ticket to GitLab issue format
        const issueData: GitLabIssueCreate = {
          title: ticket.title,
          description: buildIssueDescription(ticket),
          labels: ticket.labels,
          ...(selection.milestoneId && { milestone_id: selection.milestoneId }),
        };

        // Create the issue in the specified project
        const createdIssue = await gitlabClient.createIssue(selection.projectId, issueData);

        createdIssues.push({
          ticketId: ticket.id,
          projectId: selection.projectId,
          milestoneId: selection.milestoneId,
          issueId: createdIssue.iid,
          issueNumber: createdIssue.iid,
          url: createdIssue.web_url,
          title: createdIssue.title,
          state: createdIssue.state,
          createdAt: createdIssue.created_at,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({
          ticketId: ticket.id,
          title: ticket.title,
          error: errorMessage,
        });
      }
    }

    // Group results by project for better reporting
    const projectGroups = new Map<number, typeof createdIssues>();
    createdIssues.forEach(issue => {
      if (!projectGroups.has(issue.projectId)) {
        projectGroups.set(issue.projectId, []);
      }
      projectGroups.get(issue.projectId)!.push(issue);
    });

    // Return results
    const response = {
      success: createdIssues.length > 0,
      created: createdIssues.length,
      total: tickets.length,
      issues: createdIssues,
      projectGroups: Object.fromEntries(
        Array.from(projectGroups.entries()).map(([projectId, issues]) => [
          projectId,
          {
            count: issues.length,
            issues: issues,
          },
        ])
      ),
      errors: errors.length > 0 ? errors : undefined,
      message:
        errors.length === 0
          ? `Successfully created ${createdIssues.length} issue${createdIssues.length !== 1 ? 's' : ''} across ${projectGroups.size} project${projectGroups.size !== 1 ? 's' : ''}`
          : `Created ${createdIssues.length} of ${tickets.length} issues. ${errors.length} failed.`,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('GitLab multi-project issue creation error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        success: false,
        error: `Failed to create GitLab issues: ${errorMessage}`,
        created: 0,
        total: 0,
      },
      { status: 500 }
    );
  }
}

function buildIssueDescription(ticket: Ticket): string {
  let description = ticket.description + '\n\n';

  // Add acceptance criteria
  if (ticket.acceptanceCriteria.length > 0) {
    description += '## Acceptance Criteria\n\n';
    ticket.acceptanceCriteria.forEach((ac, index) => {
      description += `${index + 1}. ${ac.description}\n`;
    });
    description += '\n';
  }

  // Add tasks
  if (ticket.tasks.length > 0) {
    description += '## Tasks\n\n';
    ticket.tasks.forEach(task => {
      description += `- [ ] ${task.description}`;
      if (task.estimatedHours) {
        description += ` *(${task.estimatedHours}h)*`;
      }
      description += '\n';
    });
    description += '\n';
  }

  // Add metadata
  description += '---\n\n';
  description += `**Type:** ${ticket.type}\n`;
  description += `**Priority:** ${ticket.priority}\n`;

  if (ticket.estimatedHours) {
    description += `**Estimated Hours:** ${ticket.estimatedHours}\n`;
  }

  description += '\n*This issue was automatically generated by the Prompt to Issue tool.*';

  return description;
}

export async function GET() {
  return NextResponse.json(
    { message: 'GitLab multi-project issue creation API is running' },
    { status: 200 }
  );
}
