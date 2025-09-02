'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dropdown } from '@/components/ui/Dropdown';
import type { Ticket } from '@/lib/schemas';
import { cn } from '@/lib/utils';
import {
  Edit3,
  Save,
  X,
  Plus,
  Trash2,
  CheckCircle,
  Circle,
  Clock,
  Tag,
  AlertTriangle,
} from 'lucide-react';

interface TicketCardProps {
  ticket: Ticket;
  onEdit?: (ticketId: string, updates: Partial<Ticket>) => Promise<void>;
}

const TicketCard: React.FC<TicketCardProps> = ({ ticket, onEdit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTicket, setEditedTicket] = useState<Ticket>(ticket);
  const [newAC, setNewAC] = useState('');
  const [newTask, setNewTask] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [editingAC, setEditingAC] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);

  // Sync editedTicket with ticket prop when it changes
  React.useEffect(() => {
    setEditedTicket(ticket);
  }, [ticket]);

  const priorityOptions = ['low', 'medium', 'high', 'critical'] as const;
  const typeOptions = ['feature', 'bug', 'task', 'improvement', 'epic'] as const;

  const typeDropdownOptions = typeOptions.map(type => ({ value: type, label: type }));
  const priorityDropdownOptions = priorityOptions.map(priority => ({
    value: priority,
    label: priority,
    icon: <AlertTriangle className="w-3 h-3" />,
  }));

  const handleSave = async () => {
    try {
      await onEdit?.(ticket.id, editedTicket);
      setIsEditing(false);
      setShowSaveSuccess(true);

      // Hide success feedback after 2 seconds
      setTimeout(() => {
        setShowSaveSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to save ticket:', error);
      // Could add error UI feedback here if needed
    }
  };

  const handleCancel = () => {
    setEditedTicket(ticket);
    setIsEditing(false);
    setNewAC('');
    setNewTask('');
    setNewLabel('');
    setEditingAC(null);
    setEditingTask(null);
  };

  const addAcceptanceCriteria = () => {
    if (!newAC.trim()) return;

    const newCriteria = {
      id: `ac-${Date.now()}`,
      description: newAC.trim(),
      completed: false,
    };

    setEditedTicket(prev => ({
      ...prev,
      acceptanceCriteria: [...prev.acceptanceCriteria, newCriteria],
    }));
    setNewAC('');
  };

  const addTask = () => {
    if (!newTask.trim()) return;

    const newTaskItem = {
      id: `task-${Date.now()}`,
      description: newTask.trim(),
      completed: false,
    };

    setEditedTicket(prev => ({
      ...prev,
      tasks: [...prev.tasks, newTaskItem],
    }));
    setNewTask('');
  };

  const removeAcceptanceCriteria = (acId: string) => {
    setEditedTicket(prev => ({
      ...prev,
      acceptanceCriteria: prev.acceptanceCriteria.filter(ac => ac.id !== acId),
    }));
  };

  const removeTask = (taskId: string) => {
    setEditedTicket(prev => ({
      ...prev,
      tasks: prev.tasks.filter(task => task.id !== taskId),
    }));
  };

  const updateAcceptanceCriteria = (acId: string, newDescription: string) => {
    setEditedTicket(prev => ({
      ...prev,
      acceptanceCriteria: prev.acceptanceCriteria.map(ac =>
        ac.id === acId ? { ...ac, description: newDescription } : ac
      ),
    }));
    setEditingAC(null);
  };

  const updateTask = (taskId: string, newDescription: string) => {
    setEditedTicket(prev => ({
      ...prev,
      tasks: prev.tasks.map(task =>
        task.id === taskId ? { ...task, description: newDescription } : task
      ),
    }));
    setEditingTask(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'high':
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'low':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'feature':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      case 'bug':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'task':
        return 'text-purple-600 bg-purple-100 dark:bg-purple-900/20';
      case 'improvement':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'epic':
        return 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const addLabel = () => {
    if (!newLabel.trim()) return;

    const labelText = newLabel.trim();
    if (editedTicket.labels.includes(labelText)) return; // Prevent duplicates

    setEditedTicket(prev => ({
      ...prev,
      labels: [...prev.labels, labelText],
    }));
    setNewLabel('');
  };

  const removeLabel = (labelToRemove: string) => {
    setEditedTicket(prev => ({
      ...prev,
      labels: prev.labels.filter(label => label !== labelToRemove),
    }));
  };

  return (
    <div className="w-full border rounded-lg p-6 space-y-4 bg-card">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          {isEditing ? (
            <Input
              value={editedTicket.title}
              onChange={e => setEditedTicket(prev => ({ ...prev, title: e.target.value }))}
              className="font-semibold w-full"
              placeholder="Ticket title"
            />
          ) : (
            <h3 className="font-semibold text-lg">{ticket.title}</h3>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {isEditing ? (
              <Dropdown
                value={editedTicket.type}
                options={typeDropdownOptions}
                onChange={value =>
                  setEditedTicket(prev => ({
                    ...prev,
                    type: value as (typeof typeOptions)[number],
                  }))
                }
                size="sm"
              />
            ) : (
              <span
                className={cn(
                  'text-xs px-2 py-1 rounded-full font-medium',
                  getTypeColor(ticket.type)
                )}
              >
                {ticket.type}
              </span>
            )}

            {isEditing ? (
              <Dropdown
                value={editedTicket.priority}
                options={priorityDropdownOptions}
                onChange={value =>
                  setEditedTicket(prev => ({
                    ...prev,
                    priority: value as (typeof priorityOptions)[number],
                  }))
                }
                size="sm"
                icon={<AlertTriangle className="w-3 h-3" />}
              />
            ) : (
              <span
                className={cn(
                  'text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1',
                  getPriorityColor(ticket.priority)
                )}
              >
                <AlertTriangle className="w-3 h-3" />
                {ticket.priority}
              </span>
            )}

            {ticket.estimatedHours && (
              <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {ticket.estimatedHours}h
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isEditing ? (
            <>
              <Button
                size="sm"
                onClick={handleSave}
                className="cursor-pointer hover:bg-primary/90 hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                <Save className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                className="cursor-pointer hover:bg-accent hover:border-destructive/40 hover:text-destructive hover:shadow-md transition-all duration-200 hover:scale-105"
              >
                <X className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              {showSaveSuccess && (
                <div className="flex items-center gap-2 text-green-600 text-sm font-medium animate-in fade-in-0">
                  <CheckCircle className="w-4 h-4" />
                  Saved!
                </div>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <h4 className="font-medium mb-2">Description</h4>
        {isEditing ? (
          <textarea
            value={editedTicket.description}
            onChange={e => setEditedTicket(prev => ({ ...prev, description: e.target.value }))}
            className="w-full p-3 border rounded-md resize-none min-h-[80px]"
            placeholder="Ticket description"
          />
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed">{ticket.description}</p>
        )}
      </div>

      {/* Acceptance Criteria */}
      <div>
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Acceptance Criteria ({ticket.acceptanceCriteria.length})
        </h4>
        <div className="space-y-2">
          {(isEditing ? editedTicket : ticket).acceptanceCriteria.map(ac => (
            <div key={ac.id} className="flex items-start gap-2">
              <Circle className="w-4 h-4 mt-0.5 text-muted-foreground" />
              {isEditing && editingAC === ac.id ? (
                <div className="flex-1 flex gap-2">
                  <Input
                    defaultValue={ac.description}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        updateAcceptanceCriteria(ac.id, e.currentTarget.value);
                      } else if (e.key === 'Escape') {
                        setEditingAC(null);
                      }
                    }}
                    onBlur={e => updateAcceptanceCriteria(ac.id, e.target.value)}
                    autoFocus
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingAC(null)}
                    className="cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <span
                  className={cn(
                    'text-sm flex-1',
                    isEditing && 'cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5'
                  )}
                  onClick={() => isEditing && setEditingAC(ac.id)}
                >
                  {ac.description}
                </span>
              )}
              {isEditing && editingAC !== ac.id && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeAcceptanceCriteria(ac.id)}
                  className="cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}

          {isEditing && (
            <div className="flex gap-2">
              <Input
                value={newAC}
                onChange={e => setNewAC(e.target.value)}
                placeholder="Add acceptance criteria"
                onKeyDown={e => e.key === 'Enter' && addAcceptanceCriteria()}
              />
              <Button size="sm" onClick={addAcceptanceCriteria} className="cursor-pointer">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tasks */}
      <div>
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Tasks ({ticket.tasks.length})
        </h4>
        <div className="space-y-2">
          {(isEditing ? editedTicket : ticket).tasks.map(task => (
            <div key={task.id} className="flex items-start gap-2">
              <Circle className="w-4 h-4 mt-0.5 text-muted-foreground" />
              {isEditing && editingTask === task.id ? (
                <div className="flex-1 flex gap-2">
                  <Input
                    defaultValue={task.description}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        updateTask(task.id, e.currentTarget.value);
                      } else if (e.key === 'Escape') {
                        setEditingTask(null);
                      }
                    }}
                    onBlur={e => updateTask(task.id, e.target.value)}
                    autoFocus
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingTask(null)}
                    className="cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div
                  className={cn(
                    'flex-1',
                    isEditing && 'cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5'
                  )}
                  onClick={() => isEditing && setEditingTask(task.id)}
                >
                  <span className="text-sm">{task.description}</span>
                  {task.estimatedHours && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ({task.estimatedHours}h)
                    </span>
                  )}
                </div>
              )}
              {isEditing && editingTask !== task.id && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeTask(task.id)}
                  className="cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}

          {isEditing && (
            <div className="flex gap-2">
              <Input
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                placeholder="Add task"
                onKeyDown={e => e.key === 'Enter' && addTask()}
              />
              <Button size="sm" onClick={addTask} className="cursor-pointer">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Labels */}
      <div>
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Labels
        </h4>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {(isEditing ? editedTicket : ticket).labels.map((label, index) => (
              <span
                key={index}
                className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded-full flex items-center gap-1"
              >
                {label}
                {isEditing && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeLabel(label)}
                    className="cursor-pointer p-0 h-auto w-auto ml-1 hover:bg-transparent"
                  >
                    <X className="w-3 h-3 hover:text-red-500" />
                  </Button>
                )}
              </span>
            ))}
          </div>

          {isEditing && (
            <div className="flex gap-2">
              <Input
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="Add label"
                onKeyDown={e => e.key === 'Enter' && addLabel()}
                className="flex-1"
              />
              <Button size="sm" onClick={addLabel} className="cursor-pointer">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { TicketCard };
