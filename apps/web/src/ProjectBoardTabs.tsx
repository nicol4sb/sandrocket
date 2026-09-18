import React from 'react';

export type ProjectBoardTab = 'devis' | 'spending' | 'documents' | 'tasks';

const TABS: Array<{ id: ProjectBoardTab; label: string; shortLabel: string }> = [
  { id: 'devis', label: 'Devis', shortLabel: 'Devis' },
  { id: 'spending', label: 'Spending', shortLabel: 'Spend' },
  { id: 'documents', label: 'Documents', shortLabel: 'Docs' },
  { id: 'tasks', label: 'Tasks', shortLabel: 'Tasks' }
];

interface ProjectBoardTabsProps {
  activeTab: ProjectBoardTab;
  onTabChange: (tab: ProjectBoardTab) => void;
  devis: React.ReactNode;
  spending: React.ReactNode;
  documents: React.ReactNode;
  tasks: React.ReactNode;
}

export function ProjectBoardTabs({
  activeTab,
  onTabChange,
  devis,
  spending,
  documents,
  tasks
}: ProjectBoardTabsProps) {
  const panels: Record<ProjectBoardTab, React.ReactNode> = {
    devis,
    spending,
    documents,
    tasks
  };

  return (
    <div className="board-layout">
      <div className="project-folder">
        <nav className="project-folder-tabs" role="tablist" aria-label="Project sections">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`project-tab-${tab.id}`}
              className={`project-folder-tab${activeTab === tab.id ? ' project-folder-tab-active' : ''}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`project-tabpanel-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
            >
              <span className="project-folder-tab-label-full">{tab.label}</span>
              <span className="project-folder-tab-label-short">{tab.shortLabel}</span>
            </button>
          ))}
        </nav>

        <div className="project-folder-panel">
          {TABS.map((tab) =>
            activeTab === tab.id ? (
              <div
                key={tab.id}
                id={`project-tabpanel-${tab.id}`}
                role="tabpanel"
                aria-labelledby={`project-tab-${tab.id}`}
                className={`project-folder-panel-inner project-folder-panel-${tab.id}`}
              >
                {panels[tab.id]}
              </div>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}

function isProjectBoardTab(value: string): value is ProjectBoardTab {
  return value === 'devis' || value === 'spending' || value === 'documents' || value === 'tasks';
}

export function readStoredProjectTab(projectId: number): ProjectBoardTab {
  try {
    const value = localStorage.getItem(`sr:projectTab:${projectId}`);
    if (value && isProjectBoardTab(value)) {
      return value;
    }
    // Legacy combined finance tab → prefer spending
    if (value === 'finance') {
      return 'spending';
    }
  } catch {
    // ignore storage errors
  }
  return 'devis';
}

export function storeProjectTab(projectId: number, tab: ProjectBoardTab): void {
  try {
    localStorage.setItem(`sr:projectTab:${projectId}`, tab);
  } catch {
    // ignore storage errors
  }
}
