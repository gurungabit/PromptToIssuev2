# AI Ticket Automation - Mermaid Diagrams

## System Architecture Overview

```mermaid
graph TB
    subgraph "Frontend Layer"
        WB[Web Browser<br/>React 19 + Next.js 15.3.4<br/>TailwindCSS + Framer Motion]
    end

    subgraph "AWS Rosa / OpenShift Cluster"
        subgraph "Ingress Layer"
            OR[OpenShift Route<br/>HTTPS Termination<br/>SSL/TLS + Load Balancing]
        end

        subgraph "Service Layer"
            OS[OpenShift Service<br/>Service Discovery<br/>Internal Load Balancing]
        end

        subgraph "Application Pods"
            APP1[Next.js Pod 1<br/>Node.js 18-alpine<br/>Port: 3000]

        end
    end

    subgraph "Microsoft Azure"
        ENTRAID[Microsoft EntraID<br/>Azure AD B2C<br/>OAuth 2.0 / OpenID Connect]
    end

    subgraph "AWS Services"
        DDB[AWS DynamoDB<br/>NoSQL Database<br/>Auto-scaling + Multi-AZ]
    end

    subgraph "External APIs"
        OPENAI[OpenAI API<br/>GPT Models]
        ANTHROPIC[Anthropic API<br/>Claude Models]
        GOOGLE[Google API<br/>Gemini Models]
        OLLAMA[Ollama<br/>Local Models]
    end

    subgraph "MCP Servers"
        MCP_GH[GitHub MCP<br/>Repository Operations<br/>Issue Management]
        MCP_GL[GitLab MCP<br/>Custom Instance Support<br/>Project Operations]
    end

    WB --> OR
    OR --> OS
    OS --> APP1


    WB -.-> ENTRAID
    ENTRAID -.-> APP1


    APP1 --> DDB
    APP1 --> OPENAI
    APP1 --> ANTHROPIC
    APP1 --> GOOGLE
    APP1 --> OLLAMA
    APP1 --> MCP_GH
    APP1 --> MCP_GL
    MCP_GH --> GITHUB[GitHub API]
    MCP_GL --> GITLAB[GitLab API]


    classDef frontend fill:#e1f5fe
    classDef openshift fill:#fff3e0
    classDef auth fill:#f3e5f5
    classDef database fill:#e8f5e8
    classDef external fill:#fff8e1
    classDef mcp fill:#f0f4c3

    class WB frontend
    class OR,OS,APP1,APP2,APP3 openshift
    class ENTRAID auth
    class DDB database
    class OPENAI,ANTHROPIC,GOOGLE,OLLAMA,GITHUB,GITLAB external
    class MCP_GH,MCP_GL mcp
```

## Authentication Flow with EntraID

```mermaid
sequenceDiagram
    participant U as User Browser
    participant R as OpenShift Route
    participant A as Next.js App
    participant E as Microsoft EntraID
    participant D as DynamoDB

    U->>R: 1. Access Application
    R->>A: 2. Route Request
    A->>U: 3. Redirect to EntraID Login
    U->>E: 4. User Authentication
    E->>E: 5. Validate Credentials + MFA
    E->>A: 6. OAuth Callback with Auth Code
    A->>E: 7. Exchange Code for JWT Token
    E->>A: 8. Return JWT + User Info
    A->>D: 9. Store/Update User Session
    D->>A: 10. Confirm User Data
    A->>U: 11. Set Session Cookie + Redirect
    U->>A: 12. Authenticated Requests (with JWT)
    A->>A: 13. Validate JWT on Each Request
```

## Chat & Ticket Generation Flow

```mermaid
flowchart TD
    START([User Starts Chat]) --> INPUT[User Types Message]
    INPUT --> VALIDATE{Validate JWT Token}
    VALIDATE -->|Invalid| AUTH_ERROR[Authentication Error]
    VALIDATE -->|Valid| SAVE_MSG[Save Message to DynamoDB]

    SAVE_MSG --> LLM_SELECT{Select LLM Provider}
    LLM_SELECT -->|OpenAI| OPENAI[Call OpenAI API]
    LLM_SELECT -->|Anthropic| ANTHROPIC[Call Anthropic API]
    LLM_SELECT -->|Google| GOOGLE[Call Google API]
    LLM_SELECT -->|Ollama| OLLAMA[Call Ollama API]

    OPENAI --> MCP_TOOLS{MCP Tools Available?}
    ANTHROPIC --> MCP_TOOLS
    GOOGLE --> MCP_TOOLS
    OLLAMA --> MCP_TOOLS

    MCP_TOOLS -->|Yes| LOAD_MCP[Load GitHub/GitLab MCP Tools]
    MCP_TOOLS -->|No| PROCESS[Process AI Response]

    LOAD_MCP --> MCP_CALL{AI Requests MCP Tool?}
    MCP_CALL -->|GitHub| GITHUB_MCP[Execute GitHub MCP Tool]
    MCP_CALL -->|GitLab| GITLAB_MCP[Execute GitLab MCP Tool]
    MCP_CALL -->|None| PROCESS

    GITHUB_MCP --> PROCESS
    GITLAB_MCP --> PROCESS

    PROCESS --> SAVE_RESPONSE[Save AI Response to DynamoDB]
    SAVE_RESPONSE --> CHECK_TICKET{Generate Ticket?}

    CHECK_TICKET -->|No| DISPLAY[Display Response to User]
    CHECK_TICKET -->|Yes| GENERATE_TICKET[Generate Ticket Content]

    GENERATE_TICKET --> SAVE_TICKET[Save Ticket to DynamoDB]
    SAVE_TICKET --> REPO_CREATE{Create Repository Issue?}

    REPO_CREATE -->|No| DISPLAY_TICKET[Display Ticket to User]
    REPO_CREATE -->|GitHub via MCP| GITHUB_ISSUE[Create GitHub Issue via MCP]
    REPO_CREATE -->|GitLab via MCP| GITLAB_ISSUE[Create GitLab Issue via MCP]

    GITHUB_ISSUE --> UPDATE_TICKET[Update Ticket with Issue ID]
    GITLAB_ISSUE --> UPDATE_TICKET
    UPDATE_TICKET --> DISPLAY_COMPLETE[Display Complete Result]

    DISPLAY --> INPUT
    DISPLAY_TICKET --> INPUT
    DISPLAY_COMPLETE --> INPUT

    classDef process fill:#e3f2fd
    classDef decision fill:#fff3e0
    classDef external fill:#f3e5f5
    classDef error fill:#ffebee
    classDef mcp fill:#f0f4c3

    class SAVE_MSG,PROCESS,SAVE_RESPONSE,GENERATE_TICKET,SAVE_TICKET,UPDATE_TICKET process
    class VALIDATE,LLM_SELECT,CHECK_TICKET,REPO_CREATE,MCP_TOOLS,MCP_CALL decision
    class OPENAI,ANTHROPIC,GOOGLE,OLLAMA external
    class LOAD_MCP,GITHUB_MCP,GITLAB_MCP,GITHUB_ISSUE,GITLAB_ISSUE mcp
    class AUTH_ERROR error
```

## Database Schema Relationships

```mermaid
erDiagram
    USERS {
        string userId PK
        string email
        string name
        datetime createdAt
        datetime lastLoginAt
        string role
        boolean isActive
    }

    CONVERSATIONS {
        string conversationId PK
        string userId FK
        string title
        datetime createdAt
        datetime updatedAt
        boolean isShared
        string shareId
        json metadata
    }

    MESSAGES {
        string conversationId PK
        string messageId FK
        string userId
        string content
        string role
        datetime timestamp
        json metadata
        string provider
    }

    TICKETS {
        string ticketId PK
        string conversationId
        string userId
        string title
        string description
        string status
        string priority
        string gitlabIssueId
        datetime createdAt
        datetime updatedAt
        json metadata
    }

    PROVIDER_CONFIGS {
        string userId PK
        string provider FK
        string apiKey
        json settings
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    USERS ||--o{ CONVERSATIONS : "creates"
    USERS ||--o{ PROVIDER_CONFIGS : "configures"
    CONVERSATIONS ||--o{ MESSAGES : "contains"
    CONVERSATIONS ||--o{ TICKETS : "generates"
    USERS ||--o{ TICKETS : "owns"
```

## AWS Rosa Deployment Flow

```mermaid
flowchart LR
    subgraph "Development"
        DEV[Developer Push] --> GIT[Git Repository]
    end

    subgraph "CI/CD Pipeline"
        GIT --> BUILD{Build & Test}
        BUILD -->|Success| CONTAINER[Build Container Image]
        BUILD -->|Failure| FAIL[❌ Build Failed]
        CONTAINER --> ECR[Push to ECR Registry]
    end

    subgraph "AWS Rosa OpenShift"
        ECR --> DEPLOY[Deploy to OpenShift]
        DEPLOY --> CONFIG[Apply ConfigMaps & Secrets]
        CONFIG --> PODS[Create/Update Pods]
        PODS --> HEALTH{Health Checks}
        HEALTH -->|Pass| LIVE[✅ Application Live]
        HEALTH -->|Fail| ROLLBACK[↩️ Rollback to Previous Version]
    end

    subgraph "Monitoring"
        LIVE --> METRICS[Collect Metrics]
        METRICS --> ALERTS{Alert Conditions}
        ALERTS -->|Normal| DASHBOARD[Update Dashboard]
        ALERTS -->|Issues| NOTIFY[Send Notifications]
    end

    classDef dev fill:#e8f5e8
    classDef cicd fill:#e3f2fd
    classDef deploy fill:#fff3e0
    classDef monitor fill:#f3e5f5
    classDef success fill:#e8f5e8
    classDef error fill:#ffebee

    class DEV,GIT dev
    class BUILD,CONTAINER,ECR cicd
    class DEPLOY,CONFIG,PODS,HEALTH deploy
    class METRICS,ALERTS,DASHBOARD,NOTIFY monitor
    class LIVE,DASHBOARD success
    class FAIL,ROLLBACK error
```

## API Endpoints Flow

```mermaid
flowchart TD
    CLIENT[React Client] --> ROUTE[OpenShift Route :443]
    ROUTE --> SERVICE[OpenShift Service :80]
    SERVICE --> POD[Next.js Pod :3000]

    POD --> AUTH["/api/auth/*"]
    POD --> CHAT[/api/chat/]
    POD --> CONV[/api/conversations/]
    POD --> MSG[/api/messages/]
    POD --> PROV[/api/providers/]
    POD --> GL[/api/gitlab/]
    POD --> SHARED[/api/shared/]
    POD --> HEALTH[/api/health/]

    AUTH --> ENTRAID[Microsoft EntraID]

    CHAT --> DDB_MSG[(DynamoDB Messages)]
    CHAT --> LLM_APIS[LLM APIs]

    CONV --> DDB_CONV[(DynamoDB Conversations)]
    MSG --> DDB_MSG
    PROV --> DDB_PROV[(DynamoDB Provider Configs)]
    GL --> GITLAB_API[GitLab API]
    GL --> DDB_TICKETS[(DynamoDB Tickets)]
    SHARED --> DDB_CONV

    classDef api fill:#e3f2fd
    classDef database fill:#e8f5e8
    classDef external fill:#fff3e0

    class AUTH,CHAT,CONV,MSG,PROV,GL,SHARED,HEALTH api
    class DDB_MSG,DDB_CONV,DDB_PROV,DDB_TICKETS database
    class ENTRAID,LLM_APIS,GITLAB_API external
```

## Monitoring & Observability

```mermaid
flowchart TB
    subgraph "Application Layer"
        APP1[Next.js Pod 1] --> LOGS1[Application Logs]
        APP1 --> METRICS1[Metrics & Traces]
    end

    subgraph "Collection Layer"
        LOGS1 --> FLUENTD[Fluentd Log Collector]
    end

    subgraph "Storage & Processing"
        FLUENTD --> SPLUNK[Splunk Log Analytics]
        FLUENTD --> CLOUDWATCH[AWS CloudWatch Logs]
    end

    subgraph "Alerting & Notification"
        SPLUNK --> ALERTS{Alert Rules}
        DYNATRACE --> ALERTS
        CLOUDWATCH --> ALERTS

        ALERTS --> EMAIL[Email Alerts]
        ALERTS --> PAGERDUTY[PagerDuty Incidents]
    end

    classDef app fill:#e3f2fd
    classDef collect fill:#e8f5e8
    classDef storage fill:#fff3e0
    classDef alert fill:#ffebee

    class APP1,LOGS1,LOGS2,LOGS3,METRICS1,METRICS2,METRICS3 app
    class FLUENTD, collect
    class SPLUNK,CLOUDWATCH,DYNATRACE,GRAFANA storage
    class ALERTS,EMAIL,PAGERDUTY alert
```

## Security Architecture

```mermaid
flowchart TB
    subgraph "External Access"
        INTERNET[Internet Traffic] --> WAF[AWS WAF]
        WAF --> ALB[Application Load Balancer]
    end

    subgraph "OpenShift Security"
        ALB --> ROUTE[OpenShift Route<br/>TLS Termination]
        ROUTE --> RBAC{RBAC Authorization}
        RBAC --> SERVICE[OpenShift Service]
    end

    subgraph "Pod Security"
        SERVICE --> PODS[Application Pods]
        PODS --> PSP[Pod Security Policies]
        PSP --> NETWORK[Network Policies]
    end

    subgraph "Application Security"
        PODS --> JWT{JWT Validation}
        JWT --> ENTRAID[Microsoft EntraID<br/>OAuth 2.0]
        JWT --> SESSION[Session Management]
    end

    subgraph "Data Security"
        PODS --> SECRETS[Kubernetes Secrets]
        SECRETS --> DDB[DynamoDB<br/>Encryption at Rest]
        PODS --> TLS[TLS 1.3<br/>Encryption in Transit]
    end

    subgraph "Monitoring Security"
        PODS --> AUDIT[Audit Logs]
        AUDIT --> SIEM[SIEM Analysis]
        SIEM --> INCIDENT[Incident Response]
    end

    classDef external fill:#ffebee
    classDef openshift fill:#e3f2fd
    classDef security fill:#f3e5f5
    classDef data fill:#e8f5e8
    classDef monitor fill:#fff3e0

    class INTERNET,WAF,ALB external
    class ROUTE,RBAC,SERVICE openshift
    class PSP,NETWORK,JWT,ENTRAID,SESSION security
    class SECRETS,DDB,TLS data
    class AUDIT,SIEM,INCIDENT monitor
```

## MCP Tool Integration Flow

```mermaid
sequenceDiagram
    participant C as Chat API
    participant M as MCP Manager
    participant GH as GitHub MCP Server
    participant GL as GitLab MCP Server
    participant LLM as LLM Provider
    participant DB as DynamoDB

    Note over C,DB: User sends message requesting repository operation

    C->>DB: Save user message
    C->>M: Initialize MCP servers

    M->>GH: Start GitHub MCP server
    GH->>M: Register GitHub tools

    M->>GL: Start GitLab MCP server
    GL->>M: Register GitLab tools

    M->>C: Return available MCP tools

    C->>LLM: Send message + available tools

    alt LLM requests GitHub operation
        LLM->>C: Tool call: github_list_repos
        C->>M: Execute GitHub MCP tool
        M->>GH: Call list_repos tool
        GH->>GH: Authenticate with GitHub API
        GH-->>M: Return repository list
        M-->>C: Return tool result
        C->>LLM: Provide tool result
        LLM->>C: Generate response with repo info
    else LLM requests GitLab operation
        LLM->>C: Tool call: gitlab_create_issue
        C->>M: Execute GitLab MCP tool
        M->>GL: Call create_issue tool
        GL->>GL: Authenticate with GitLab API
        GL-->>M: Return created issue
        M-->>C: Return tool result
        C->>LLM: Provide tool result
        LLM->>C: Generate response with issue link
    else No tool required
        LLM->>C: Generate standard response
    end

    C->>DB: Save assistant response
    C-->>C: Return response to user
```
