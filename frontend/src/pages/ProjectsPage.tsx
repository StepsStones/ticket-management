import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Project } from '../types';
import { useNotification } from '../context/NotificationContext';
import { PaginationControls } from '../components/PaginationControls';
import { Building2, Plus, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  const { showToast } = useNotification();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination (6 per page for 3-column grid)
  const PAGE_SIZE = 6;
  const [projectPage, setProjectPage] = useState(1);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await api.getProjects(false);
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleToggle = async (project: Project) => {
    try {
      await api.toggleProjectStatus(project.id);
      showToast(
        'Project Status Updated',
        `Project ${project.name} is now ${project.is_active ? 'inactive' : 'active'}.`,
        'SUCCESS'
      );
      loadProjects();
    } catch (err: any) {
      showToast('Action Failed', err.message || 'Failed to toggle status', 'ERROR');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createProject({
        name,
        code,
        location,
        description,
        is_active: true,
      });
      setShowModal(false);
      setName('');
      setCode('');
      setLocation('');
      setDescription('');
      showToast('Project Created Successfully', `Project ${name} added to catalog.`, 'SUCCESS');
      loadProjects();
    } catch (err: any) {
      showToast('Creation Failed', err.message || 'Failed to create project', 'ERROR');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-amber-600" />
            <span>StepsStone Real Estate Projects</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure residential gated communities, villa plots, and associated legal ticket allocations.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={loadProjects}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Project</span>
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 animate-pulse">
              <div className="flex items-start justify-between">
                <div>
                  <div className="h-4 bg-slate-200 rounded w-16 mb-2"></div>
                  <div className="h-5 bg-slate-200 rounded w-40"></div>
                </div>
                <div className="h-5 bg-slate-200 rounded-full w-14"></div>
              </div>
              <div className="h-4 bg-slate-200 rounded w-24"></div>
              <div className="h-3 bg-slate-100 rounded w-full"></div>
              <div className="pt-3 border-t border-slate-100 flex justify-between">
                <div className="h-4 bg-slate-200 rounded w-20"></div>
                <div className="h-4 bg-slate-200 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No Projects Found</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">No real estate projects are registered in the directory.</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold inline-flex items-center space-x-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Project</span>
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.slice((projectPage - 1) * PAGE_SIZE, projectPage * PAGE_SIZE).map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-300 transition"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {p.code}
                      </span>
                      <h3 className="font-bold text-base text-slate-900 mt-1">{p.name}</h3>
                    </div>
                    {p.is_active ? (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Active
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        Inactive
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-600 font-medium">
                    📍 {p.location}
                  </div>

                  {p.description && (
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {p.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">
                    {p.ticket_count || 0} Associated {p.ticket_count === 1 ? 'Ticket' : 'Tickets'}
                  </span>
                  <button
                    onClick={() => handleToggle(p)}
                    className={`text-[11px] font-semibold px-2 py-1 rounded transition ${
                      p.is_active
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    {p.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <PaginationControls
              currentPage={projectPage}
              totalPages={Math.max(1, Math.ceil(projects.length / PAGE_SIZE))}
              totalItems={projects.length}
              pageSize={PAGE_SIZE}
              onPageChange={setProjectPage}
              itemLabel="projects"
              loading={loading}
            />
          </div>
        </div>
      )}

      {/* Modal: Create Project */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add StepsStone Project</h3>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Secret Aara - 03"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Project Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SS-SA03"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Location *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Madhavaram, Chennai"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Brief details about layout, approvals, amenities..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
