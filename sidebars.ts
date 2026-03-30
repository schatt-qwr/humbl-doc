import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  architectureSidebar: [
    {
      type: 'category',
      label: 'Architecture Overview',
      collapsible: true,
      collapsed: false,
      link: { type: 'doc', id: 'architecture/overview' },
      items: [
        'architecture/module-map',
        {
          type: 'category',
          label: 'Core Subsystems',
          collapsible: true,
          collapsed: true,
          items: [
            'architecture/subsystems/langchain-framework',
            'architecture/subsystems/pipeline',
            'architecture/subsystems/tool-system',
            'architecture/subsystems/security',
            'architecture/subsystems/platform-abstraction',
            'architecture/subsystems/memory',
            'architecture/subsystems/lm-gateway',
            'architecture/subsystems/devices-sdk',
            'architecture/subsystems/voice-io',
          ],
        },
        {
          type: 'category',
          label: 'Supporting Systems',
          collapsible: true,
          collapsed: true,
          items: [
            'architecture/supporting/resilience',
            'architecture/supporting/input-system',
            'architecture/supporting/settings',
            'architecture/supporting/payments-quota',
            'architecture/supporting/logging',
            'architecture/supporting/mcp',
            'architecture/supporting/services-agent',
          ],
        },
        'architecture/data-flow',
        'architecture/db-layout',
        'architecture/startup-sequence',
        'architecture/concurrency-model',
      ],
    },
  ],

  statusSidebar: [
    {
      type: 'category',
      label: 'Implementation Status',
      collapsible: true,
      collapsed: false,
      link: { type: 'doc', id: 'status/overview' },
      items: [
        'status/gap-analysis',
        'status/test-coverage',
        'status/module-completion',
        'status/roadmap',
      ],
    },
  ],

  apiSidebar: [
    {
      type: 'category',
      label: 'API Reference',
      collapsible: true,
      collapsed: false,
      link: { type: 'doc', id: 'api/index' },
      items: [
        {
          type: 'category',
          label: 'Pipeline',
          collapsible: true,
          collapsed: true,
          items: [
            'api/pipeline/pipeline-orchestrator',
            'api/pipeline/pipeline-state',
            'api/pipeline/state-graph',
            'api/pipeline/nodes',
          ],
        },
        {
          type: 'category',
          label: 'Tool System',
          collapsible: true,
          collapsed: true,
          items: [
            'api/tools/humbl-tool',
            'api/tools/tool-registry',
            'api/tools/models',
          ],
        },
        {
          type: 'category',
          label: 'LM Gateway',
          collapsible: true,
          collapsed: true,
          items: [
            'api/lm-gateway/i-lm-gateway',
            'api/lm-gateway/connectors',
            'api/lm-gateway/scheduling',
          ],
        },
        {
          type: 'category',
          label: 'Memory',
          collapsible: true,
          collapsed: true,
          items: [
            'api/memory/i-memory-service',
            'api/memory/conversation-store',
            'api/memory/vector-store',
            'api/memory/embedding-gateway',
          ],
        },
        {
          type: 'category',
          label: 'Devices SDK',
          collapsible: true,
          collapsed: true,
          items: [
            'api/devices/i-peripheral-provider',
            'api/devices/i-connected-device',
            'api/devices/device-registry',
          ],
        },
        {
          type: 'category',
          label: 'Security',
          collapsible: true,
          collapsed: true,
          items: [
            'api/security/access-control',
            'api/security/permission-service',
            'api/security/confirmation-service',
          ],
        },
        {
          type: 'category',
          label: 'Resources',
          collapsible: true,
          collapsed: true,
          items: [
            'api/resources/hardware-resource-manager',
            'api/resources/resource-lease',
          ],
        },
        {
          type: 'category',
          label: 'Services & Agent',
          collapsible: true,
          collapsed: true,
          items: [
            'api/services/humbl-agent',
            'api/services/service-event-bus',
          ],
        },
        {
          type: 'category',
          label: 'Voice I/O',
          collapsible: true,
          collapsed: true,
          items: [
            'api/voice/vad-stt-tts',
            'api/voice/voice-session-runner',
          ],
        },
        {
          type: 'category',
          label: 'Platform',
          collapsible: true,
          collapsed: true,
          items: [
            'api/platform/platform-factory',
            'api/platform/manager-interfaces',
          ],
        },
      ],
    },
  ],

  guideSidebar: [
    {
      type: 'category',
      label: 'Developer Guide',
      collapsible: true,
      collapsed: false,
      link: { type: 'doc', id: 'guide/getting-started' },
      items: [
        'guide/project-setup',
        {
          type: 'category',
          label: 'How-To Guides',
          collapsible: true,
          collapsed: false,
          items: [
            'guide/howto/add-a-tool',
            'guide/howto/add-a-platform-manager',
            'guide/howto/add-an-lm-connector',
            'guide/howto/add-a-device-provider',
          ],
        },
        {
          type: 'category',
          label: 'Patterns & Conventions',
          collapsible: true,
          collapsed: true,
          items: [
            'guide/patterns/immutable-state',
            'guide/patterns/gate-model',
            'guide/patterns/naming-conventions',
            'guide/patterns/testing',
          ],
        },
      ],
    },
  ],
};

export default sidebars;
