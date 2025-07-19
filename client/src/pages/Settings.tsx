import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Shield, Eye, Download, Trash2, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

interface ModerationSettings {
  hateSpeechEnabled: boolean;
  nudityEnabled: boolean;
  violenceEnabled: boolean;
  autoBlock: boolean;
  customBlockedWords: string[];
  customAllowedWords: string[];
}

interface PrivacySettings {
  dataRetentionDays: number;
  allowDataExport: boolean;
  allowAnalytics: boolean;
}

const Settings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Moderation settings
  const [moderationSettings, setModerationSettings] = useState<ModerationSettings>({
    hateSpeechEnabled: true,
    nudityEnabled: true,
    violenceEnabled: true,
    autoBlock: true,
    customBlockedWords: [],
    customAllowedWords: []
  });

  // Privacy settings
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    dataRetentionDays: 90,
    allowDataExport: true,
    allowAnalytics: false
  });

  // New word inputs
  const [newBlockedWord, setNewBlockedWord] = useState('');
  const [newAllowedWord, setNewAllowedWord] = useState('');

  useEffect(() => {
    if (user) {
      setModerationSettings(user.moderationSettings);
      setPrivacySettings(user.privacySettings);
    }
  }, [user]);

  const handleModerationSettingChange = (setting: keyof ModerationSettings, value: any) => {
    setModerationSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handlePrivacySettingChange = (setting: keyof PrivacySettings, value: any) => {
    setPrivacySettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const saveModerationSettings = async () => {
    try {
      setSaving(true);
      const response = await axios.put('/api/user/settings/moderation', moderationSettings);
      
      if (response.data.success) {
        updateUser({ moderationSettings: response.data.moderationSettings });
        toast.success('Moderation settings saved successfully');
      }
    } catch (error) {
      console.error('Failed to save moderation settings:', error);
      toast.error('Failed to save moderation settings');
    } finally {
      setSaving(false);
    }
  };

  const savePrivacySettings = async () => {
    try {
      setSaving(true);
      const response = await axios.put('/api/user/settings/privacy', privacySettings);
      
      if (response.data.success) {
        updateUser({ privacySettings: response.data.privacySettings });
        toast.success('Privacy settings saved successfully');
      }
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
      toast.error('Failed to save privacy settings');
    } finally {
      setSaving(false);
    }
  };

  const addBlockedWord = async () => {
    if (!newBlockedWord.trim()) return;

    try {
      const response = await axios.post('/api/user/settings/blocked-words', {
        word: newBlockedWord.trim()
      });

      if (response.data.success) {
        setModerationSettings(prev => ({
          ...prev,
          customBlockedWords: response.data.customBlockedWords
        }));
        setNewBlockedWord('');
        toast.success('Word added to blocked list');
      }
    } catch (error) {
      console.error('Failed to add blocked word:', error);
      toast.error('Failed to add blocked word');
    }
  };

  const removeBlockedWord = async (word: string) => {
    try {
      const response = await axios.delete(`/api/user/settings/blocked-words/${encodeURIComponent(word)}`);

      if (response.data.success) {
        setModerationSettings(prev => ({
          ...prev,
          customBlockedWords: response.data.customBlockedWords
        }));
        toast.success('Word removed from blocked list');
      }
    } catch (error) {
      console.error('Failed to remove blocked word:', error);
      toast.error('Failed to remove blocked word');
    }
  };

  const addAllowedWord = async () => {
    if (!newAllowedWord.trim()) return;

    try {
      const response = await axios.post('/api/user/settings/allowed-words', {
        word: newAllowedWord.trim()
      });

      if (response.data.success) {
        setModerationSettings(prev => ({
          ...prev,
          customAllowedWords: response.data.customAllowedWords
        }));
        setNewAllowedWord('');
        toast.success('Word added to allowed list');
      }
    } catch (error) {
      console.error('Failed to add allowed word:', error);
      toast.error('Failed to add allowed word');
    }
  };

  const removeAllowedWord = async (word: string) => {
    try {
      const response = await axios.delete(`/api/user/settings/allowed-words/${encodeURIComponent(word)}`);

      if (response.data.success) {
        setModerationSettings(prev => ({
          ...prev,
          customAllowedWords: response.data.customAllowedWords
        }));
        toast.success('Word removed from allowed list');
      }
    } catch (error) {
      console.error('Failed to remove allowed word:', error);
      toast.error('Failed to remove allowed word');
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      action();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Moderation Settings
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure how your messages are filtered and moderated
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* AI Moderation Toggles */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-900">AI Content Detection</h3>
            
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">Hate Speech Detection</span>
                  <p className="text-xs text-gray-500">Block messages containing hate speech</p>
                </div>
                <input
                  type="checkbox"
                  checked={moderationSettings.hateSpeechEnabled}
                  onChange={(e) => handleModerationSettingChange('hateSpeechEnabled', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">Nudity Detection</span>
                  <p className="text-xs text-gray-500">Block images and videos containing nudity</p>
                </div>
                <input
                  type="checkbox"
                  checked={moderationSettings.nudityEnabled}
                  onChange={(e) => handleModerationSettingChange('nudityEnabled', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">Violence Detection</span>
                  <p className="text-xs text-gray-500">Block content containing violence</p>
                </div>
                <input
                  type="checkbox"
                  checked={moderationSettings.violenceEnabled}
                  onChange={(e) => handleModerationSettingChange('violenceEnabled', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">Auto-Block Messages</span>
                  <p className="text-xs text-gray-500">Automatically block messages that violate rules</p>
                </div>
                <input
                  type="checkbox"
                  checked={moderationSettings.autoBlock}
                  onChange={(e) => handleModerationSettingChange('autoBlock', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>
          </div>

          {/* Custom Blocked Words */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-900">Custom Blocked Words</h3>
            <p className="text-sm text-gray-500">Words that will always be blocked</p>
            
            <div className="flex space-x-2">
              <input
                type="text"
                value={newBlockedWord}
                onChange={(e) => setNewBlockedWord(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, addBlockedWord)}
                placeholder="Enter word to block..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addBlockedWord}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {moderationSettings.customBlockedWords.map((word) => (
                <span
                  key={word}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800"
                >
                  {word}
                  <button
                    onClick={() => removeBlockedWord(word)}
                    className="ml-2 text-red-600 hover:text-red-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Custom Allowed Words */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-900">Custom Allowed Words</h3>
            <p className="text-sm text-gray-500">Words that will always be allowed (overrides AI detection)</p>
            
            <div className="flex space-x-2">
              <input
                type="text"
                value={newAllowedWord}
                onChange={(e) => setNewAllowedWord(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, addAllowedWord)}
                placeholder="Enter word to allow..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addAllowedWord}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {moderationSettings.customAllowedWords.map((word) => (
                <span
                  key={word}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                >
                  {word}
                  <button
                    onClick={() => removeAllowedWord(word)}
                    className="ml-2 text-green-600 hover:text-green-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={saveModerationSettings}
            disabled={saving}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center"
          >
            {saving ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Moderation Settings
              </>
            )}
          </button>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Eye className="w-5 h-5 mr-2" />
            Privacy Settings
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Control how your data is stored and used
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Data Retention Period (days)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={privacySettings.dataRetentionDays}
                onChange={(e) => handlePrivacySettingChange('dataRetentionDays', parseInt(e.target.value))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                How long to keep your chat data (1-365 days)
              </p>
            </div>

            <label className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">Allow Data Export</span>
                <p className="text-xs text-gray-500">Enable downloading your chat data</p>
              </div>
              <input
                type="checkbox"
                checked={privacySettings.allowDataExport}
                onChange={(e) => handlePrivacySettingChange('allowDataExport', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">Allow Analytics</span>
                <p className="text-xs text-gray-500">Help improve the service with anonymous usage data</p>
              </div>
              <input
                type="checkbox"
                checked={privacySettings.allowAnalytics}
                onChange={(e) => handlePrivacySettingChange('allowAnalytics', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>

          <button
            onClick={savePrivacySettings}
            disabled={saving}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center"
          >
            {saving ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Privacy Settings
              </>
            )}
          </button>
        </div>
      </div>

      {/* Account Management */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Account Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage your account and data
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Export All Data</h3>
              <p className="text-xs text-gray-500">Download all your chat data and settings</p>
            </div>
            <button
              onClick={() => {/* Implement data export */}}
              className="flex items-center px-3 py-2 text-sm text-blue-600 hover:text-blue-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
            <div>
              <h3 className="text-sm font-medium text-red-900">Delete Account</h3>
              <p className="text-xs text-red-700">Permanently delete your account and all data</p>
            </div>
            <button
              onClick={() => {/* Implement account deletion */}}
              className="flex items-center px-3 py-2 text-sm text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 