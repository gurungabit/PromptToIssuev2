"use client";

import React from 'react';
import { useChat } from '@/contexts/ChatContext';
import { Button } from '@/components/ui/Button';
import { TicketCard } from './TicketCard';
import { ProjectSelectionModal } from '@/components/gitlab/ProjectSelectionModal';
import { Check, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ProjectSelection } from '@/lib/schemas';

const TicketsPreview: React.FC = () => {
  const { 
    pendingTickets, 
    approveTickets, 
    rejectTickets, 
    editTicket, 
    isLoading,
    gitlabConfig,
    showProjectSelection,
    setShowProjectSelection,
    createGitLabIssues
  } = useChat();

  if (pendingTickets.length === 0) {
    return null;
  }

  const handleProjectSelection = (projectSelection: ProjectSelection) => {
    createGitLabIssues(pendingTickets, projectSelection);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="border rounded-lg p-6 bg-card space-y-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">
                Ticket Preview ({pendingTickets.length})
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Review and approve the generated tickets
            </p>
          </div>
        </div>

        {/* Tickets List - Vertical Stack Only */}
        <div className="space-y-6">
          {pendingTickets.map((ticket, index) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="w-full"
            >
              <TicketCard ticket={ticket} onEdit={editTicket} />
            </motion.div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {pendingTickets.length} ticket{pendingTickets.length !== 1 ? 's' : ''} ready for creation
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={rejectTickets}
              disabled={isLoading}
              className="flex items-center gap-2 cursor-pointer hover:border-red-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200 hover:scale-105 hover:shadow-md disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              <X className="w-4 h-4" />
              Reject & Clarify
            </Button>
            
            <Button
              variant="outline"
              onClick={() => approveTickets()}
              disabled={isLoading}
              className="flex items-center gap-2 cursor-pointer hover:border-green-300 hover:text-green-600 hover:bg-primary/90 hover:shadow-lg transition-all duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              <Check className="w-4 h-4" />
              {isLoading ? 'Creating...' : 'Approve & Create'}
            </Button>
          </div>
        </div>

        {/* Help Text */}
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
          <p className="mb-1">
            <strong>💡 Review Tips:</strong>
          </p>
          <ul className="space-y-1 ml-4">
            <li>• Click the edit button on any ticket to modify details</li>
            <li>• Add or remove acceptance criteria and tasks as needed</li>
            <li>• Approve to create tickets on your configured platform</li>
            <li>• Reject to provide clarifications and regenerate</li>
          </ul>
        </div>

        {/* Project Selection Modal */}
        {gitlabConfig && (
          <ProjectSelectionModal
            isOpen={showProjectSelection}
            onClose={() => setShowProjectSelection(false)}
            onConfirm={handleProjectSelection}
            tickets={pendingTickets}
            gitlabConfig={gitlabConfig}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export { TicketsPreview }; 