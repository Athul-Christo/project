import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, Check, X, Clock, TrendingUp, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

interface NewWord {
  _id: string;
  word: string;
  context: {
    originalText: string;
    surroundingText: string;
  };
  detection: {
    frequency: number;
    firstDetected: string;
    lastDetected: string;
    confidence: number;
  };
  status: 'pending' | 'approved' | 'rejected' | 'ignored';
  userDecision: {
    markedAsHateSpeech: boolean;
    decisionDate?: string;
    decisionReason?: string;
  };
  aiAnalysis: {
    hateSpeechProbability: number;
    category: string;
    severity: 'low' | 'medium' | 'high';
    suggestedAction: 'block' | 'allow' | 'review';
  };
  createdAt: string;
}

const NewWords: React.FC = () => {
  const [newWords, setNewWords] = useState<NewWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'ignored'>('pending');
  const [selectedWord, setSelectedWord] = useState<NewWord | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadNewWords();
  }, [filter]);

  const loadNewWords = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/user/new-words', {
        params: { status: filter, limit: 50 }
      });
      setNewWords(response.data.newWords);
    } catch (error) {
      console.error('Failed to load new words:', error);
      toast.error('Failed to load new words');
    } finally {
      setLoading(false);
    }
  };

  const reviewWord = async (wordId: string, action: 'approve' | 'reject' | 'ignore', reason = '') => {
    try {
      const response = await axios.post(`/api/user/new-words/${wordId}/review`, {
        action,
        reason
      });

      if (response.data.success) {
        setNewWords(prev => 
          prev.map(word => 
            word._id === wordId 
              ? { ...word, status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'ignored' }
              : word
          )
        );
        toast.success(`Word ${action}d successfully`);
      }
    } catch (error) {
      console.error('Failed to review word:', error);
      toast.error('Failed to review word');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-red-100 text-red-800';
      case 'rejected':
        return 'bg-green-100 text-green-800';
      case 'ignored':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" />
                New Words Review
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Review and manage words detected in your chats that might be hate speech
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                {newWords.length} words found
              </span>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex space-x-1">
            {(['pending', 'approved', 'rejected', 'ignored'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  filter === status
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Words List */}
        <div className="divide-y divide-gray-200">
          {newWords.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No {filter} words found
              </h3>
              <p className="text-gray-500">
                {filter === 'pending' 
                  ? 'No new words detected that need review'
                  : `No words with ${filter} status`
                }
              </p>
            </div>
          ) : (
            newWords.map((word) => (
              <div key={word._id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg font-semibold text-gray-900">
                        "{word.word}"
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(word.status)}`}>
                        {word.status}
                      </span>
                      <span className={`text-sm ${getSeverityColor(word.aiAnalysis.severity)}`}>
                        {word.aiAnalysis.severity} severity
                      </span>
                    </div>
                    
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        {word.detection.frequency} occurrences
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        Last: {formatDate(word.detection.lastDetected)}
                      </div>
                      <div>
                        Confidence: {Math.round(word.detection.confidence * 100)}%
                      </div>
                    </div>

                    {word.context.originalText && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Context:</span> "{word.context.originalText}"
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedWord(word);
                        setShowDetails(true);
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {word.status === 'pending' && (
                      <>
                        <button
                          onClick={() => reviewWord(word._id, 'approve')}
                          className="px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Block
                        </button>
                        <button
                          onClick={() => reviewWord(word._id, 'reject')}
                          className="px-3 py-1 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Allow
                        </button>
                        <button
                          onClick={() => reviewWord(word._id, 'ignore')}
                          className="px-3 py-1 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600"
                        >
                          Ignore
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Word Details Modal */}
      {showDetails && selectedWord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Word Details: "{selectedWord.word}"
                </h2>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">AI Analysis</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Hate Speech Probability:</span>
                    <span className="ml-2 font-medium">
                      {Math.round((selectedWord.aiAnalysis.hateSpeechProbability || 0) * 100)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Category:</span>
                    <span className="ml-2 font-medium">{selectedWord.aiAnalysis.category}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Severity:</span>
                    <span className={`ml-2 font-medium ${getSeverityColor(selectedWord.aiAnalysis.severity)}`}>
                      {selectedWord.aiAnalysis.severity}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Suggested Action:</span>
                    <span className="ml-2 font-medium">{selectedWord.aiAnalysis.suggestedAction}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Detection History</h3>
                <div className="text-sm space-y-1">
                  <div>
                    <span className="text-gray-500">Frequency:</span>
                    <span className="ml-2 font-medium">{selectedWord.detection.frequency} times</span>
                  </div>
                  <div>
                    <span className="text-gray-500">First Detected:</span>
                    <span className="ml-2 font-medium">{formatDate(selectedWord.detection.firstDetected)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Last Detected:</span>
                    <span className="ml-2 font-medium">{formatDate(selectedWord.detection.lastDetected)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Confidence:</span>
                    <span className="ml-2 font-medium">{Math.round(selectedWord.detection.confidence * 100)}%</span>
                  </div>
                </div>
              </div>

              {selectedWord.context.originalText && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Context</h3>
                  <div className="bg-gray-50 p-3 rounded-md text-sm">
                    <p className="text-gray-700">"{selectedWord.context.originalText}"</p>
                  </div>
                </div>
              )}

              {selectedWord.userDecision.decisionDate && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">User Decision</h3>
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="text-gray-500">Decision:</span>
                      <span className="ml-2 font-medium">
                        {selectedWord.userDecision.markedAsHateSpeech ? 'Marked as hate speech' : 'Allowed'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Date:</span>
                      <span className="ml-2 font-medium">{formatDate(selectedWord.userDecision.decisionDate)}</span>
                    </div>
                    {selectedWord.userDecision.decisionReason && (
                      <div>
                        <span className="text-gray-500">Reason:</span>
                        <span className="ml-2 font-medium">{selectedWord.userDecision.decisionReason}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedWord.status === 'pending' && (
                <div className="flex space-x-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      reviewWord(selectedWord._id, 'approve');
                      setShowDetails(false);
                    }}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center justify-center"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Block Word
                  </button>
                  <button
                    onClick={() => {
                      reviewWord(selectedWord._id, 'reject');
                      setShowDetails(false);
                    }}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center justify-center"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Allow Word
                  </button>
                  <button
                    onClick={() => {
                      reviewWord(selectedWord._id, 'ignore');
                      setShowDetails(false);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                  >
                    Ignore
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewWords; 