import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, UserPlus, Search, User, UserCog, AlertCircle } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Badge from '../../../components/ui/Badge';
import { Colporter, Leader } from '../../../types';
import AddColporterForm from '../users/AddColporterForm';
import AddLeaderForm from '../people/AddLeaderForm';

interface PeopleSetupStepProps {
  colporters: Colporter[];
  leaders: Leader[];
  onColportersChange: (colporters: Colporter[]) => void;
  onLeadersChange: (leaders: Leader[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const PeopleSetupStep: React.FC<PeopleSetupStepProps> = ({
  colporters,
  leaders,
  onColportersChange,
  onLeadersChange,
  onNext,
  onBack
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'colporters' | 'leaders'>('colporters');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingColporter, setEditingColporter] = useState<Colporter | null>(null);
  const [editingLeader, setEditingLeader] = useState<Leader | null>(null);

  const handleAddColporter = (data: Omit<Colporter, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
    const newColporter: Colporter = {
      ...data,
      id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      status: 'ACTIVE',
      hasUser: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onColportersChange([...colporters, newColporter]);
    setShowAddForm(false);
  };

  const handleEditColporter = (data: Partial<Colporter>) => {
    if (!editingColporter) return;
    onColportersChange(
      colporters.map(colporter =>
        colporter.id === editingColporter.id
          ? { ...colporter, ...data }
          : colporter
      )
    );
    setEditingColporter(null);
  };

  const handleAddLeader = (data: any) => {
    const newLeader: Leader = {
      ...data,
      id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      status: 'ACTIVE',
      hasUser: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onLeadersChange([...leaders, newLeader]);
    setShowAddForm(false);
  };

  const handleEditLeader = (data: Partial<Leader>) => {
    if (!editingLeader) return;
    onLeadersChange(
      leaders.map(leader =>
        leader.id === editingLeader.id
          ? { ...leader, ...data }
          : leader
      )
    );
    setEditingLeader(null);
  };

  const handleDeleteColporter = (id: string) => {
    onColportersChange(colporters.filter(colporter => colporter.id !== id));
  };

  const handleDeleteLeader = (id: string) => {
    onLeadersChange(leaders.filter(leader => leader.id !== id));
  };

  const filteredColporters = searchTerm
    ? colporters.filter(colporter =>
        `${colporter.name} ${colporter.apellido}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        colporter.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : colporters;

  const filteredLeaders = searchTerm
    ? leaders.filter(leader =>
        `${leader.name} ${leader.apellido}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        leader.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : leaders;

  const canProceed = colporters.length > 0 && leaders.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Users className="text-primary-600" size={24} />
          People Setup
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onBack}
          >
            Back
          </Button>
          <Button
            variant="primary"
            onClick={onNext}
            disabled={!canProceed}
          >
            Next
          </Button>
        </div>
      </div>

      <p className="text-gray-600">
        Add colporters and leaders who will participate in the program. You must add at least one of each to proceed.
      </p>

      {!canProceed && (
        <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="text-warning-500 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-warning-700">
            <p className="font-medium">Required participants</p>
            <p>You need to add at least one colporter and one leader to proceed to the next step.</p>
            <ul className="mt-2 list-disc list-inside">
              {colporters.length === 0 && <li>Add at least one colporter</li>}
              {leaders.length === 0 && <li>Add at least one leader</li>}
            </ul>
          </div>
        </div>
      )}

      <div className="flex border-b border-gray-200">
        <button
          className={`py-4 px-6 text-sm font-medium border-b-2 ${
            activeTab === 'colporters'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
          onClick={() => setActiveTab('colporters')}
        >
          <div className="flex items-center gap-2">
            <User size={18} />
            Colporters ({colporters.length})
            {colporters.length === 0 && <span className="text-danger-500 text-xs">Required</span>}
          </div>
        </button>
        <button
          className={`py-4 px-6 text-sm font-medium border-b-2 ${
            activeTab === 'leaders'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
          onClick={() => setActiveTab('leaders')}
        >
          <div className="flex items-center gap-2">
            <UserCog size={18} />
            Leaders ({leaders.length})
            {leaders.length === 0 && <span className="text-danger-500 text-xs">Required</span>}
          </div>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Input
          placeholder={`Search ${activeTab}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={<Search size={18} />}
          className="w-full sm:w-64"
        />
        
        <Button
          variant="primary"
          leftIcon={<UserPlus size={18} />}
          onClick={() => setShowAddForm(true)}
        >
          Add {activeTab === 'colporters' ? 'Colporter' : 'Leader'}
        </Button>
      </div>

      {activeTab === 'colporters' ? (
        <Card>
          {filteredColporters.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      School
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Age
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredColporters.map((colporter) => (
                    <tr key={colporter.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 mr-3">
                            <User size={16} />
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            {colporter.name} {colporter.apellido}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {colporter.email}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {colporter.school}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <Badge variant="secondary" size="sm">
                          {colporter.age}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingColporter(colporter)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteColporter(colporter.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <User size={48} className="mx-auto text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No colporters</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding a new colporter.
              </p>
              <div className="mt-6">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<UserPlus size={16} />}
                  onClick={() => setShowAddForm(true)}
                >
                  Add Colporter
                </Button>
              </div>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          {filteredLeaders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Institution
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLeaders.map((leader) => (
                    <tr key={leader.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-success-100 flex items-center justify-center text-success-700 mr-3">
                            <UserCog size={16} />
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            {leader.name} {leader.apellido}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {leader.email}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {leader.institution}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingLeader(leader)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteLeader(leader.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <UserCog size={48} className="mx-auto text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No leaders</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding a new leader.
              </p>
              <div className="mt-6">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<UserPlus size={16} />}
                  onClick={() => setShowAddForm(true)}
                >
                  Add Leader
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {showAddForm && activeTab === 'colporters' && (
        <AddColporterForm
          onClose={() => {
            setShowAddForm(false);
            setEditingColporter(null);
          }}
          onSubmit={editingColporter ? handleEditColporter : handleAddColporter}
          initialData={editingColporter || undefined}
        />
      )}

      {showAddForm && activeTab === 'leaders' && (
        <AddLeaderForm
          onClose={() => {
            setShowAddForm(false);
            setEditingLeader(null);
          }}
          onSubmit={editingLeader ? handleEditLeader : handleAddLeader}
          initialData={editingLeader || undefined}
        />
      )}
    </div>
  );
};

export default PeopleSetupStep;